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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-surface rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 sm:p-8 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {mode === "login" ? "Intră în cont" : "Creează cont"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-muted hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Username
              </label>
              <input
                type="text"
                required
                placeholder="ex: andrei_cool"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              required
              placeholder="email@exemplu.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Parolă</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Minim 6 caractere"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading
              ? "Se încarcă..."
              : mode === "login"
                ? "Intră"
                : "Creează cont"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          {mode === "login" ? (
            <>
              Nu ai cont?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
                className="text-primary font-medium hover:underline"
              >
                Creează unul
              </button>
            </>
          ) : (
            <>
              Ai deja cont?{" "}
              <button
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className="text-primary font-medium hover:underline"
              >
                Intră în cont
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
