"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import Avatar from "@/components/Avatar";

type Friend = {
  id: string;
  from_username: string;
  to_username: string;
  status: string;
};

type ProfileInfo = {
  username: string;
  avatar_url: string | null;
  points: number;
};

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2200);
    const t2 = setTimeout(onDone, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]">
      <div className={`px-5 py-3 rounded-2xl bg-foreground text-background text-sm font-medium shadow-2xl ${leaving ? "animate-toast-out" : "animate-toast-in"}`}>{message}</div>
    </div>
  );
}

export default function FriendsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [username, setUsername] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [addInput, setAddInput] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/"); return; }
      const { data: profile } = await supabase.from("hangout_profiles").select("username").eq("id", data.user.id).single();
      if (profile) {
        setUsername(profile.username);
        fetchFriends(profile.username);
      }
    });
  }, [router]);

  async function fetchFriends(uname: string) {
    setLoading(true);
    const { data } = await supabase
      .from("hangout_friends")
      .select("*")
      .or(`from_username.eq.${uname},to_username.eq.${uname}`);

    if (data) {
      setFriends(data);
      const names = new Set<string>();
      data.forEach((f) => {
        names.add(f.from_username);
        names.add(f.to_username);
      });
      names.delete(uname);
      if (names.size > 0) {
        const { data: profs } = await supabase
          .from("hangout_profiles")
          .select("username, avatar_url, points")
          .in("username", Array.from(names));
        if (profs) {
          const map: Record<string, ProfileInfo> = {};
          profs.forEach((p) => { map[p.username] = p; });
          setProfiles(map);
        }
      }
    }
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !addInput.trim() || addInput.trim() === username) return;
    const { error } = await supabase.from("hangout_friends").insert([
      { from_username: username, to_username: addInput.trim() },
    ]);
    if (error) {
      if (error.code === "23505") setToast("Cerere deja trimisă.");
      else setToast("Utilizatorul nu există.");
      return;
    }
    setAddInput("");
    setToast("Cerere trimisă!");
    fetchFriends(username);
  }

  async function handleAccept(id: string) {
    await supabase.from("hangout_friends").update({ status: "accepted" }).eq("id", id);
    if (username) fetchFriends(username);
    setToast("Prieten acceptat!");
  }

  async function handleReject(id: string) {
    await supabase.from("hangout_friends").delete().eq("id", id);
    if (username) fetchFriends(username);
  }

  async function handleRemove(id: string) {
    await supabase.from("hangout_friends").delete().eq("id", id);
    if (username) fetchFriends(username);
    setToast("Prieten eliminat.");
  }

  const accepted = friends.filter((f) => f.status === "accepted");
  const pendingReceived = friends.filter((f) => f.status === "pending" && f.to_username === username);
  const pendingSent = friends.filter((f) => f.status === "pending" && f.from_username === username);

  function friendName(f: Friend) {
    return f.from_username === username ? f.to_username : f.from_username;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
            <div className="skeleton w-8 h-8 rounded-full" />
            <div className="skeleton h-5 w-20" />
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.push("/profile")} className="flex items-center gap-2 text-muted hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            <span className="text-sm font-medium">{t("nav.back")}</span>
          </button>
          <span className="text-lg font-bold">{t("profile.friends")}</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Add friend */}
        <form onSubmit={handleAdd} className="flex gap-2 mb-8">
          <input
            type="text"
            placeholder={t("friends.add") + " (username)"}
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          <button type="submit" disabled={!addInput.trim()} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-30 active:scale-95">
            {t("friends.add")}
          </button>
        </form>

        {/* Pending received */}
        {pendingReceived.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">{t("friends.requests")}</h2>
            <div className="space-y-2">
              {pendingReceived.map((f) => {
                const name = friendName(f);
                const p = profiles[name];
                return (
                  <div key={f.id} className="flex items-center justify-between bg-surface border border-border rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={p?.avatar_url} name={name} size="sm" />
                      <div>
                        <div className="font-semibold text-sm">{name}</div>
                        <div className="text-xs text-muted">{p?.points ?? 0} pts</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(f.id)} className="px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-semibold hover:bg-success/20 transition-all active:scale-95">
                        {t("friends.accept")}
                      </button>
                      <button onClick={() => handleReject(f.id)} className="px-3 py-1.5 rounded-lg bg-danger-light text-danger text-xs font-semibold hover:bg-danger/20 transition-all active:scale-95">
                        {t("friends.reject")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Friends list */}
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          {t("profile.friends")} ({accepted.length})
        </h2>
        {accepted.length === 0 && pendingSent.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">👋</div>
            <h3 className="text-xl font-bold mb-2">{t("friends.none")}</h3>
          </div>
        ) : (
          <div className="space-y-2">
            {accepted.map((f) => {
              const name = friendName(f);
              const p = profiles[name];
              return (
                <div key={f.id} className="flex items-center justify-between bg-surface border border-border rounded-xl p-3 group">
                  <div className="flex items-center gap-3">
                    <Avatar src={p?.avatar_url} name={name} size="sm" />
                    <div>
                      <div className="font-semibold text-sm">{name}</div>
                      <div className="text-xs text-muted">{p?.points ?? 0} pts</div>
                    </div>
                  </div>
                  <button onClick={() => handleRemove(f.id)} className="text-xs text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
                    {t("friends.remove")}
                  </button>
                </div>
              );
            })}
            {pendingSent.map((f) => {
              const name = friendName(f);
              const p = profiles[name];
              return (
                <div key={f.id} className="flex items-center justify-between bg-surface border border-border rounded-xl p-3 opacity-50">
                  <div className="flex items-center gap-3">
                    <Avatar src={p?.avatar_url} name={name} size="sm" />
                    <div>
                      <div className="font-semibold text-sm">{name}</div>
                      <div className="text-xs text-muted">{t("friends.pending")}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {toast && <Toast message={toast} onDone={clearToast} />}
    </div>
  );
}
