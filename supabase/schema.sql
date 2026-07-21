-- ============================================================================
-- 82-0 Arena — Supabase schema
-- Run ONCE in Supabase Studio → SQL Editor (paste the whole file, click Run).
-- Safe to re-run: everything is idempotent (create if not exists / or replace).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) PROFILES — one row per account. Holds the player's rank (Elo) + record.
--    Elo is NEVER written directly by a client; only the SECURITY DEFINER
--    match functions below can change it, so it can't be self-inflated.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique,
  elo        integer not null default 1000,
  wins       integer not null default 0,
  losses     integer not null default 0,
  best_elo   integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Any signed-in user can read profiles (leaderboard + seeing an opponent's rank).
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable"
  on public.profiles for select to authenticated using (true);

-- A user may edit only their own row...
drop policy if exists "profiles self-update" on public.profiles;
create policy "profiles self-update"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- ...and only the username column (Elo/record are locked to the functions).
revoke update on public.profiles from authenticated, anon;
grant  update (username) on public.profiles to authenticated;

-- Auto-create a profile the moment someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2) DRAFT ROOMS — the realtime source of truth for online snake drafts.
-- ---------------------------------------------------------------------------
create table if not exists public.draft_rooms (
  code        text primary key,
  host        uuid references auth.users(id) on delete cascade,
  guest       uuid references auth.users(id) on delete set null,
  host_name   text,
  guest_name  text,
  status      text not null default 'lobby',   -- lobby | drafting | placing | done
  seed        bigint,
  pool        jsonb not null default '[]'::jsonb,   -- the 15 draftable players
  picks       jsonb not null default '[]'::jsonb,   -- [{player, by:0|1}] in order
  host_roster jsonb,
  guest_roster jsonb,
  result      jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.draft_rooms enable row level security;

-- Signed-in users can read rooms (needed to look up a room by code to join,
-- and to watch a room you're in). Rooms are ephemeral game state, not private.
drop policy if exists "rooms readable" on public.draft_rooms;
create policy "rooms readable"
  on public.draft_rooms for select to authenticated using (true);

-- All mutations go through the functions below (SECURITY DEFINER), so no
-- direct insert/update/delete policies are granted to clients.
revoke insert, update, delete on public.draft_rooms from authenticated, anon;

-- Broadcast row changes to both players in real time.
alter publication supabase_realtime add table public.draft_rooms;

-- ---------------------------------------------------------------------------
-- 3) FUNCTIONS — create / join / start / pick / place / finish
-- ---------------------------------------------------------------------------

-- Create a room, return its 4-letter code.
create or replace function public.create_draft_room(p_host_name text)
returns text language plpgsql security definer set search_path = public as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  new_code text;
  i int;
begin
  loop
    new_code := '';
    for i in 1..4 loop
      new_code := new_code || substr(chars, floor(random()*length(chars))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.draft_rooms where code = new_code);
  end loop;
  insert into public.draft_rooms (code, host, host_name)
  values (new_code, auth.uid(), p_host_name);
  return new_code;
end; $$;

-- Join a lobby as the guest.
create or replace function public.join_draft_room(room_code text, p_guest_name text)
returns public.draft_rooms language plpgsql security definer set search_path = public as $$
declare r public.draft_rooms;
begin
  select * into r from public.draft_rooms where code = room_code for update;
  if not found then raise exception 'Room not found'; end if;
  if r.status <> 'lobby' then raise exception 'Match already started'; end if;
  if r.host = auth.uid() then raise exception 'You are already the host'; end if;
  if r.guest is not null then raise exception 'Room is full'; end if;
  update public.draft_rooms
     set guest = auth.uid(), guest_name = p_guest_name, updated_at = now()
   where code = room_code returning * into r;
  return r;
end; $$;

-- Host starts the draft with a client-generated 15-man pool + sim seed.
create or replace function public.start_draft(room_code text, p_pool jsonb, p_seed bigint)
returns public.draft_rooms language plpgsql security definer set search_path = public as $$
declare r public.draft_rooms;
begin
  select * into r from public.draft_rooms where code = room_code for update;
  if not found then raise exception 'Room not found'; end if;
  if r.host <> auth.uid() then raise exception 'Only the host can start'; end if;
  if r.guest is null then raise exception 'Waiting for a second player'; end if;
  if r.status <> 'lobby' then raise exception 'Already started'; end if;
  if jsonb_array_length(p_pool) <> 15 then raise exception 'Pool must be 15 players'; end if;
  update public.draft_rooms
     set pool = p_pool, seed = p_seed, status = 'drafting', updated_at = now()
   where code = room_code returning * into r;
  return r;
end; $$;

-- Make a pick — enforces snake order and that the player is available.
create or replace function public.make_pick(room_code text, p_player jsonb)
returns public.draft_rooms language plpgsql security definer set search_path = public as $$
declare
  r public.draft_rooms;
  snake int[] := array[0,1,1,0,0,1,1,0,0,1];  -- 1-indexed in SQL
  pick_count int;
  turn_idx int;
  expected uuid;
  pname text := p_player->>'name';
begin
  select * into r from public.draft_rooms where code = room_code for update;
  if not found then raise exception 'Room not found'; end if;
  if r.status <> 'drafting' then raise exception 'Draft is not active'; end if;
  pick_count := jsonb_array_length(r.picks);
  if pick_count >= 10 then raise exception 'Draft already full'; end if;
  turn_idx := snake[pick_count + 1];
  expected := case when turn_idx = 0 then r.host else r.guest end;
  if auth.uid() <> expected then raise exception 'Not your turn'; end if;
  if not exists (select 1 from jsonb_array_elements(r.pool) e where e->>'name' = pname) then
    raise exception 'Player not in the pool';
  end if;
  if exists (select 1 from jsonb_array_elements(r.picks) e where (e->'player')->>'name' = pname) then
    raise exception 'Player already drafted';
  end if;
  update public.draft_rooms
     set picks = r.picks || jsonb_build_object('player', p_player, 'by', turn_idx),
         status = case when pick_count + 1 >= 10 then 'placing' else 'drafting' end,
         updated_at = now()
   where code = room_code returning * into r;
  return r;
end; $$;

-- Submit your final court arrangement (your five drafted players).
create or replace function public.submit_roster(room_code text, p_roster jsonb)
returns public.draft_rooms language plpgsql security definer set search_path = public as $$
declare r public.draft_rooms;
begin
  select * into r from public.draft_rooms where code = room_code for update;
  if not found then raise exception 'Room not found'; end if;
  if auth.uid() = r.host then
    update public.draft_rooms set host_roster = p_roster, updated_at = now() where code = room_code returning * into r;
  elsif auth.uid() = r.guest then
    update public.draft_rooms set guest_roster = p_roster, updated_at = now() where code = room_code returning * into r;
  else
    raise exception 'You are not in this room';
  end if;
  return r;
end; $$;

-- Record the finished game once. Winner (0=host, 1=guest) gains Elo; the
-- loser's Elo is unchanged. Both squads run the same seeded sim, so the two
-- clients agree on the winner. Callable only while status = 'placing'.
create or replace function public.finish_draft(room_code text, winner int, p_result jsonb)
returns public.draft_rooms language plpgsql security definer set search_path = public as $$
declare
  r public.draft_rooms;
  w uuid; l uuid;
  w_elo int; l_elo int;
  expected numeric; gain int;
begin
  select * into r from public.draft_rooms where code = room_code for update;
  if not found then raise exception 'Room not found'; end if;
  if r.status <> 'placing' then raise exception 'Game not ready to finish'; end if;
  if auth.uid() not in (r.host, r.guest) then raise exception 'Not in this room'; end if;
  if winner not in (0,1) then raise exception 'Bad winner'; end if;

  w := case when winner = 0 then r.host else r.guest end;
  l := case when winner = 0 then r.guest else r.host end;

  select elo into w_elo from public.profiles where id = w;
  select elo into l_elo from public.profiles where id = l;
  expected := 1.0 / (1.0 + power(10, (l_elo - w_elo) / 400.0));
  gain := round(32 * (1 - expected));

  update public.profiles
     set elo = elo + gain, best_elo = greatest(best_elo, elo + gain),
         wins = wins + 1, updated_at = now()
   where id = w;
  update public.profiles
     set losses = losses + 1, updated_at = now()
   where id = l;

  update public.draft_rooms
     set status = 'done', result = jsonb_set(coalesce(p_result,'{}'::jsonb), '{eloGain}', to_jsonb(gain)),
         updated_at = now()
   where code = room_code returning * into r;
  return r;
end; $$;

-- Offline battle results (Historic / All-Time) count toward the account rank
-- when logged in. Single-player, so it's trust-based — it only moves your own
-- rank. Mirrors the client's overall→Elo mapping and K=32 update.
create or replace function public.apply_offline_result(p_won boolean, p_opp_overall numeric)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  me public.profiles;
  opp_elo int;
  expected numeric;
  delta int;
  new_elo int;
begin
  select * into me from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'No profile'; end if;
  opp_elo := greatest(760, least(2050, round(880 + (p_opp_overall - 48) * 20)));
  expected := 1.0 / (1.0 + power(10, (opp_elo - me.elo) / 400.0));
  delta := round(32 * ((case when p_won then 1 else 0 end) - expected));
  new_elo := greatest(0, me.elo + delta);
  update public.profiles
     set elo = new_elo,
         best_elo = greatest(best_elo, new_elo),
         wins = wins + (case when p_won then 1 else 0 end),
         losses = losses + (case when p_won then 0 else 1 end),
         updated_at = now()
   where id = auth.uid()
   returning * into me;
  return me;
end; $$;

-- Let signed-in users call the functions.
grant execute on function
  public.create_draft_room(text),
  public.join_draft_room(text, text),
  public.start_draft(text, jsonb, bigint),
  public.make_pick(text, jsonb),
  public.submit_roster(text, jsonb),
  public.finish_draft(text, int, jsonb),
  public.apply_offline_result(boolean, numeric)
to authenticated;

-- ---------------------------------------------------------------------------
-- 4) LEADERBOARD view (top by Elo) — optional convenience.
-- ---------------------------------------------------------------------------
create or replace view public.leaderboard as
  select username, elo, wins, losses, best_elo
  from public.profiles
  where username is not null
  order by elo desc;

-- ---------------------------------------------------------------------------
-- 5) PACK & PLAY — best team overall (offline mode). Its own leaderboard,
--    separate from Elo: it tracks the single highest-overall five you've built
--    from packs. record_pack_score keeps only your best.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists pack_best integer not null default 0;

create or replace function public.record_pack_score(p_overall numeric)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare me public.profiles;
begin
  update public.profiles
     set pack_best = greatest(pack_best, round(p_overall)), updated_at = now()
   where id = auth.uid()
   returning * into me;
  if not found then raise exception 'No profile'; end if;
  return me;
end; $$;

grant execute on function public.record_pack_score(numeric) to authenticated;

create or replace view public.pack_leaderboard as
  select username, pack_best
  from public.profiles
  where username is not null and pack_best > 0
  order by pack_best desc;
