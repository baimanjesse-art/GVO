import { useState } from "react";
import { useAuth } from "../lib/auth.jsx";

/**
 * Email/password login + signup, toggling between the two. Used on the Account
 * screen and as the gate in front of the online modes. `note` lets callers
 * explain why sign-in is needed (e.g. "Sign in to play Draft").
 */
export default function AuthPanel({ note }) {
  const { signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState("in"); // in | up
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  if (!configured) {
    return (
      <div className="rounded-2xl border border-line bg-panel p-5 text-sm text-slate-400">
        <div className="mb-1 font-display text-lg font-bold uppercase tracking-wide text-slate-200">
          Accounts coming online
        </div>
        Login and online play aren't switched on for this build yet. Solo and the
        battle modes work right now — your Battle Rank is saved on this device.
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const fn =
      mode === "in"
        ? signIn(email.trim(), password)
        : signUp(email.trim(), password, username);
    const { error } = await fn;
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    if (mode === "up") {
      setNotice(
        "Account created. If email confirmation is on, check your inbox — otherwise you're in."
      );
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-line bg-panel p-5">
      <div className="flex gap-1 rounded-xl bg-court p-1 text-sm font-bold">
        {["in", "up"].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setNotice(null);
            }}
            className={`flex-1 rounded-lg py-1.5 transition ${
              mode === m ? "bg-hoop text-black" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {m === "in" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>

      {note && <p className="text-xs text-slate-400">{note}</p>}

      {mode === "up" && (
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          Display name
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            placeholder="e.g. BucketsBaimen"
            className="mt-1 w-full rounded-xl border border-line bg-court px-3 py-2.5 text-base font-semibold text-slate-100 outline-none focus:border-hoop"
          />
        </label>
      )}
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 w-full rounded-xl border border-line bg-court px-3 py-2.5 text-base text-slate-100 outline-none focus:border-hoop"
        />
      </label>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          placeholder="at least 6 characters"
          className="mt-1 w-full rounded-xl border border-line bg-court px-3 py-2.5 text-base text-slate-100 outline-none focus:border-hoop"
        />
      </label>

      {error && (
        <div className="rounded-xl border border-rose-700 bg-rose-950/40 p-2.5 text-sm text-rose-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-700 bg-emerald-950/40 p-2.5 text-sm text-emerald-300">
          {notice}
        </div>
      )}

      <button
        disabled={busy}
        className="w-full rounded-xl bg-hoop py-3 font-black text-black transition hover:bg-hoop2 active:scale-[0.98] disabled:opacity-40"
      >
        {busy ? "…" : mode === "in" ? "Log in" : "Create account"}
      </button>
    </form>
  );
}
