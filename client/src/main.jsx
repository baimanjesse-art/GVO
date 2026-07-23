import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./lib/auth.jsx";
import { SportProvider } from "./lib/sport.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <SportProvider>
        <App />
      </SportProvider>
    </AuthProvider>
  </React.StrictMode>
);
