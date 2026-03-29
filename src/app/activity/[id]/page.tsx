"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Activity,
  Comment,
  getCategoryInfo,
  formatDate,
  timeAgo,
} from "@/lib/shared";
import type { User } from "@supabase/supabase-js";

type Participant = {
  id: string;
  name: string;
  joined_at: string;
};

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
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);

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
      .select("username")
      .eq("id", userId)
      .single();
    if (data) setUsername(data.username);
  }

  async function fetchAll() {
    setLoading(true);
    const [actRes, partRes, comRes] = await Promise.all([
      supabase.from("hangout_activities").select("*").eq("id", id).single(),
      supabase
        .from("hangout_participants")
        .select("*")
        .eq("activity_id", id)
        .order("joined_at", { ascending: true }),
      supabase
        .from("hangout_comments")
        .select("*")
        .eq("activity_id", id)
        .order("created_at", { ascending: true }),
    ]);
    if (actRes.data) setActivity(actRes.data);
    if (partRes.data) setParticipants(partRes.data);
    if (comRes.data) setComments(comRes.data);
    setLoading(false);
  }

  async function handleJoin() {
    if (!user || !username) return;
    const { error } = await supabase
      .from("hangout_participants")
      .insert([{ activity_id: id, name: username }]);
    if (!error) {
      setJoined(true);
      fetchAll();
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !username || !newComment.trim()) return;
    const { error } = await supabase.from("hangout_comments").insert([
      {
        activity_id: id,
        user_id: user.id,
        username,
        content: newComment.trim(),
      },
    ]);
    if (!error) {
      setNewComment("");
      fetchAll();
    }
  }

  async function handleDeleteComment(commentId: string) {
    const { error } = await supabase
      .from("hangout_comments")
      .delete()
      .eq("id", commentId);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  }

  function handleShare(platform: string) {
    if (!activity) return;
    const url = window.location.href;
    const text = `Hai la "${activity.title}" pe Hangout! ${activity.location}, ${formatDate(activity.date)}`;
    if (platform === "whatsapp") {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
        "_blank"
      );
    } else if (platform === "copy") {
      navigator.clipboard.writeText(url);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-muted">Activitatea nu a fost găsită.</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold"
        >
          Înapoi acasă
        </button>
      </div>
    );
  }

  const cat = getCategoryInfo(activity.category);
  const isFull = participants.length >= activity.max_people;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-muted hover:text-foreground transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="text-lg font-bold tracking-tight">Detalii</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Activity Details */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-background rounded-lg text-sm font-medium text-muted">
              {cat.icon} {cat.label}
            </span>
            <span className="text-sm font-medium text-primary">
              {formatDate(activity.date)}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold mb-3">
            {activity.title}
          </h1>

          {activity.description && (
            <p className="text-muted mb-6 leading-relaxed">
              {activity.description}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-background rounded-xl p-3 text-center">
              <div className="text-xs text-muted mb-1">Locație</div>
              <div className="text-sm font-semibold">{activity.location}</div>
            </div>
            <div className="bg-background rounded-xl p-3 text-center">
              <div className="text-xs text-muted mb-1">Vârstă</div>
              <div className="text-sm font-semibold">
                {activity.min_age}–{activity.max_age} ani
              </div>
            </div>
            <div className="bg-background rounded-xl p-3 text-center">
              <div className="text-xs text-muted mb-1">Participanți</div>
              <div className="text-sm font-semibold">
                {participants.length}/{activity.max_people}
              </div>
            </div>
            <div className="bg-background rounded-xl p-3 text-center">
              <div className="text-xs text-muted mb-1">Propus de</div>
              <div className="text-sm font-semibold">{activity.created_by}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {joined ||
            participants.some((p) => p.name === username) ? (
              <span className="px-5 py-2.5 rounded-full text-sm font-semibold text-success bg-success/10">
                Participi ✓
              </span>
            ) : isFull ? (
              <span className="px-5 py-2.5 rounded-full text-sm font-semibold text-muted bg-background">
                Complet
              </span>
            ) : user ? (
              <button
                onClick={handleJoin}
                className="px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-all active:scale-95"
              >
                Participă
              </button>
            ) : null}

            <button
              onClick={() => handleShare("whatsapp")}
              className="px-4 py-2.5 rounded-full text-sm font-medium border border-border hover:bg-surface-hover transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </button>

            <button
              onClick={() => handleShare("copy")}
              className="px-4 py-2.5 rounded-full text-sm font-medium border border-border hover:bg-surface-hover transition-all flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copiază link
            </button>
          </div>
        </div>

        {/* Participants */}
        {participants.length > 0 && (
          <div className="bg-surface rounded-2xl border border-border p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">
              Participanți ({participants.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-full"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-[10px] font-bold">
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="bg-surface rounded-2xl border border-border p-6">
          <h2 className="text-lg font-bold mb-4">
            Comentarii ({comments.length})
          </h2>

          {comments.length === 0 && (
            <p className="text-sm text-muted mb-4">
              Niciun comentariu încă. Fii primul!
            </p>
          )}

          <div className="space-y-4 mb-6">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {c.username[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{c.username}</span>
                    <span className="text-xs text-muted">
                      {timeAgo(c.created_at)}
                    </span>
                    {user && c.user_id === user.id && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-xs text-muted hover:text-danger transition-colors"
                      >
                        Șterge
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-muted mt-0.5">{c.content}</p>
                </div>
              </div>
            ))}
          </div>

          {user ? (
            <form onSubmit={handleComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Scrie un comentariu..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-50 active:scale-95"
              >
                Trimite
              </button>
            </form>
          ) : (
            <p className="text-sm text-muted text-center py-2">
              Intră în cont pentru a comenta.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
