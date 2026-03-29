"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  onClose: () => void;
  onAuth: () => void;
};

export default function AuthModal({ onClose, onAuth }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from("hangout_profiles")
          .insert([{ id: data.user.id, username }]);

        if (profileError) {
          setError(profileError.message);
          setLoading(false);
          return;
        }
      }

      onAuth();
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      onAuth();
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-surface rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 sm:p-8 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
            H
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-background flex items-center justify-center text-muted hover:text-foreground transition-colors active:scale-90"
          >
            ✕
          </button>
        </div>
        <h2 className="text-2xl font-bold mt-3">
          {mode === "login" ? "Bine ai revenit!" : "Creează cont"}
        </h2>
        <p className="text-sm text-muted mt-1 mb-6">
          {mode === "login"
            ? "Intră în contul tău pentru a continua."
            : "Creează un cont pentru a propune și participa."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                type="text"
                required
                placeholder="ex: andrei_cool"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              placeholder="email@exemplu.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Parolă
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Minim 6 caractere"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-danger bg-danger-light px-4 py-3 rounded-xl">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {loading
              ? "Se încarcă..."
              : mode === "login"
                ? "Intră în cont"
                : "Creează cont"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-border text-center">
          <p className="text-sm text-muted">
            {mode === "login" ? "Nu ai cont?" : "Ai deja cont?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
              }}
              className="text-primary font-semibold hover:underline"
            >
              {mode === "login" ? "Creează unul" : "Intră în cont"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
