"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Activity,
  Comment,
  getCategoryInfo,
  formatDate,
  timeAgo,
} from "@/lib/shared";
import Avatar from "@/components/Avatar";
import type { User } from "@supabase/supabase-js";

type Participant = {
  id: string;
  name: string;
  joined_at: string;
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
      <div className={`px-5 py-3 rounded-2xl bg-foreground text-background text-sm font-medium shadow-2xl ${leaving ? "animate-toast-out" : "animate-toast-in"}`}>
        {message}
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) fetchUsername(data.user.id);
    });
    fetchAll();
  }, [id]);

  async function fetchUsername(userId: string) {
    const { data } = await supabase
      .from("hangout_profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .single();
    if (data) {
      setUsername(data.username);
      setMyAvatarUrl(data.avatar_url);
    }
  }

  async function fetchAll() {
    setLoading(true);
    const [actRes, partRes, comRes] = await Promise.all([
      supabase.from("hangout_activities").select("*").eq("id", id).single(),
      supabase.from("hangout_participants").select("*").eq("activity_id", id).order("joined_at", { ascending: true }),
      supabase.from("hangout_comments").select("*").eq("activity_id", id).order("created_at", { ascending: true }),
    ]);
    if (actRes.data) setActivity(actRes.data);
    if (partRes.data) setParticipants(partRes.data);
    if (comRes.data) setComments(comRes.data);

    // Fetch avatars for all usernames
    const allNames = new Set<string>();
    if (partRes.data) partRes.data.forEach((p: Participant) => allNames.add(p.name));
    if (comRes.data) comRes.data.forEach((c: Comment) => allNames.add(c.username));
    if (allNames.size > 0) {
      const { data: profiles } = await supabase
        .from("hangout_profiles")
        .select("username, avatar_url")
        .in("username", Array.from(allNames));
      if (profiles) {
        const map: Record<string, string> = {};
        profiles.forEach((p) => {
          if (p.avatar_url) map[p.username] = p.avatar_url;
        });
        setAvatarMap(map);
      }
    }

    setLoading(false);
  }

  async function handleJoin() {
    if (!user || !username) return;
    // Prevent duplicate join
    const already = participants.some((p) => p.name === username);
    if (already) return;
    const { error } = await supabase
      .from("hangout_participants")
      .insert([{ activity_id: id, name: username }]);
    if (!error) {
      setJoined(true);
      await supabase.rpc("add_points", { user_username: username, amount: 10 });
      setToast("Te-ai alăturat! +10 puncte");
      fetchAll();
    }
  }

  async function handleLeave() {
    if (!username) return;
    const { error } = await supabase
      .from("hangout_participants")
      .delete()
      .eq("activity_id", id)
      .eq("name", username);
    if (!error) {
      setJoined(false);
      await supabase.rpc("add_points", { user_username: username, amount: -10 });
      setToast("Ai părăsit activitatea. -10 puncte");
      fetchAll();
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !username || !newComment.trim()) return;
    setSending(true);
    const { error } = await supabase.from("hangout_comments").insert([
      { activity_id: id, user_id: user.id, username, content: newComment.trim() },
    ]);
    setSending(false);
    if (!error) {
      setNewComment("");
      fetchAll();
    }
  }

  async function handleDeleteComment(commentId: string) {
    const { error } = await supabase.from("hangout_comments").delete().eq("id", commentId);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setToast("Comentariu șters.");
    }
  }

  async function handleReport(reportedUsername: string) {
    if (!username || reportedUsername === username) return;
    const { error } = await supabase
      .from("hangout_reports")
      .insert([{
        activity_id: id,
        reported_username: reportedUsername,
        reporter_username: username,
      }]);
    if (error) {
      if (error.code === "23505") {
        setToast("Ai raportat deja acest participant.");
      } else {
        setToast("Eroare: " + error.message);
      }
      return;
    }
    // -15 puncte celui raportat
    await supabase.rpc("add_points", { user_username: reportedUsername, amount: -15 });
    setToast(`${reportedUsername} a fost raportat. -15 puncte`);
  }

  function handleShare(platform: string) {
    if (!activity) return;
    const url = window.location.href;
    const text = `Hai la "${activity.title}" pe Hangout! 📍 ${activity.location}, 📅 ${formatDate(activity.date)}`;
    if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank");
    } else if (platform === "copy") {
      navigator.clipboard.writeText(url);
      setToast("Link copiat!");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
            <div className="skeleton w-8 h-8 rounded-full" />
            <div className="skeleton h-5 w-20" />
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8">
            <div className="skeleton h-6 w-24 mb-4" />
            <div className="skeleton h-9 w-3/4 mb-3" />
            <div className="skeleton h-4 w-full mb-2" />
            <div className="skeleton h-4 w-2/3 mb-6" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="text-6xl mb-2">😕</div>
        <h2 className="text-2xl font-bold">Activitatea nu a fost găsită</h2>
        <p className="text-muted">Poate a fost ștearsă sau link-ul e greșit.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-full font-semibold hover:shadow-lg transition-all active:scale-95"
        >
          Înapoi acasă
        </button>
      </div>
    );
  }

  const cat = getCategoryInfo(activity.category);
  const isFull = participants.length >= activity.max_people;
  const alreadyJoined = joined || participants.some((p) => p.name === username);
  const spotsLeft = activity.max_people - participants.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Înapoi</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleShare("copy")}
              className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-muted hover:text-foreground transition-all active:scale-90"
              title="Copiază link"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => handleShare("whatsapp")}
              className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-muted hover:text-foreground transition-all active:scale-90"
              title="Trimite pe WhatsApp"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Activity Details */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 mb-6 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background rounded-xl text-sm font-medium text-muted">
              {cat.icon} {cat.label}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-light rounded-xl text-sm font-medium text-primary">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(activity.date)}
            </span>
          </div>

          <h1 className="text-xl sm:text-3xl font-extrabold mb-3 leading-tight">
            {activity.title}
          </h1>

          {activity.description && (
            <p className="text-muted mb-6 leading-relaxed text-[15px]">
              {activity.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 mb-6">
            <div className="bg-background rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Locație
              </div>
              <div className="text-sm font-bold">{activity.location}</div>
            </div>
            <div className="bg-background rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Vârstă
              </div>
              <div className="text-sm font-bold">{activity.min_age}–{activity.max_age} ani</div>
            </div>
            <div className="bg-background rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Locuri
              </div>
              <div className="text-sm font-bold">
                {participants.length}/{activity.max_people}
                {spotsLeft <= 3 && spotsLeft > 0 && (
                  <span className="text-primary ml-1">({spotsLeft} {spotsLeft === 1 ? "liber" : "libere"})</span>
                )}
              </div>
            </div>
            <div className="bg-background rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Organizator
              </div>
              <div className="text-sm font-bold">{activity.created_by}</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                style={{ width: `${Math.min((participants.length / activity.max_people) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Join button */}
          {alreadyJoined ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="flex-1 flex items-center gap-2 px-4 sm:px-5 py-3 rounded-xl bg-success/10 text-success font-semibold text-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Participi la această activitate
              </div>
              <button
                onClick={handleLeave}
                className="px-4 py-2.5 sm:py-3 rounded-xl border border-border text-sm font-medium text-muted hover:text-danger hover:border-danger/30 hover:bg-danger-light transition-all active:scale-95 text-center"
              >
                Părăsește
              </button>
            </div>
          ) : isFull ? (
            <div className="px-5 py-3 rounded-xl bg-background text-muted font-semibold text-sm text-center">
              Toate locurile sunt ocupate
            </div>
          ) : user ? (
            <button
              onClick={handleJoin}
              className="w-full py-3.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-[0.98]"
            >
              Participă la activitate
            </button>
          ) : (
            <div className="px-5 py-3 rounded-xl bg-background text-muted text-sm text-center">
              Intră în cont pentru a participa.
            </div>
          )}
        </div>

        {/* Participants */}
        {participants.length > 0 && (
          <div className="bg-surface rounded-2xl border border-border p-6 mb-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Participanți ({participants.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {participants.map((p, i) => {
                const isPast = activity && new Date(activity.date) < new Date();
                const canReport = isPast && user && username && p.name !== username;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 px-3 py-2 bg-background rounded-xl animate-scale-in group/part"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <Avatar src={avatarMap[p.name]} name={p.name} size="xs" />
                    <span className="text-sm font-medium">{p.name}</span>
                    {canReport && (
                      <button
                        onClick={() => handleReport(p.name)}
                        className="ml-1 text-muted hover:text-danger transition-colors opacity-0 group-hover/part:opacity-100"
                        title="Raportează — nu a venit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="bg-surface rounded-2xl border border-border p-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Comentarii ({comments.length})
          </h2>

          {comments.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-sm text-muted">
                Niciun comentariu încă. Fii primul care întreabă ceva!
              </p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            {comments.map((c, i) => (
              <div
                key={c.id}
                className="flex gap-3 animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <Avatar src={avatarMap[c.username]} name={c.username} size="sm" className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="bg-background rounded-xl rounded-tl-sm px-4 py-2.5">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold">{c.username}</span>
                      <span className="text-xs text-muted">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-muted">{c.content}</p>
                  </div>
                  {user && c.user_id === user.id && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="text-xs text-muted hover:text-danger transition-colors mt-1 ml-4"
                    >
                      Șterge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {user ? (
            <form onSubmit={handleComment} className="flex gap-2">
              <Avatar src={myAvatarUrl} name={username} size="sm" className="shrink-0" />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Scrie un comentariu..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || sending}
                  className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-30 active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4 px-4 bg-background rounded-xl">
              <p className="text-sm text-muted">
                Intră în cont pentru a comenta.
              </p>
            </div>
          )}
        </div>
      </main>

      {toast && <Toast message={toast} onDone={clearToast} />}
    </div>
  );
}
