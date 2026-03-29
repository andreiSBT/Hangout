"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Activity, getCategoryInfo, formatDate } from "@/lib/shared";
import type { User } from "@supabase/supabase-js";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [myActivities, setMyActivities] = useState<Activity[]>([]);
  const [joinedActivities, setJoinedActivities] = useState<Activity[]>([]);
  const [tab, setTab] = useState<"created" | "joined">("created");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/");
        return;
      }
      setUser(data.user);
      fetchProfile(data.user.id);
    });
  }, [router]);

  async function fetchProfile(userId: string) {
    setLoading(true);

    const { data: profile } = await supabase
      .from("hangout_profiles")
      .select("username")
      .eq("id", userId)
      .single();
    if (profile) setUsername(profile.username);

    const { data: created } = await supabase
      .from("hangout_activities")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });
    if (created) setMyActivities(created);

    const { data: participations } = await supabase
      .from("hangout_participants")
      .select("activity_id")
      .eq("name", profile?.username ?? "");

    if (participations && participations.length > 0) {
      const ids = participations.map((p) => p.activity_id);
      const { data: joined } = await supabase
        .from("hangout_activities")
        .select("*")
        .in("id", ids)
        .order("date", { ascending: false });
      if (joined) setJoinedActivities(joined);
    }

    setLoading(false);
  }

  const activities = tab === "created" ? myActivities : joinedActivities;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
          <span className="text-lg font-bold tracking-tight">Profilul meu</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile Header */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 mb-6 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
            {username?.[0]?.toUpperCase() ?? "?"}
          </div>
          <h1 className="text-2xl font-extrabold">{username}</h1>
          <p className="text-sm text-muted mt-1">{user?.email}</p>
          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center">
              <div className="text-xl font-bold">{myActivities.length}</div>
              <div className="text-xs text-muted">Create</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">
                {joinedActivities.length}
              </div>
              <div className="text-xs text-muted">Participări</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("created")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === "created"
                ? "bg-foreground text-background"
                : "bg-surface border border-border text-muted hover:bg-surface-hover"
            }`}
          >
            Activitățile mele
          </button>
          <button
            onClick={() => setTab("joined")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === "joined"
                ? "bg-foreground text-background"
                : "bg-surface border border-border text-muted hover:bg-surface-hover"
            }`}
          >
            Participări
          </button>
        </div>

        {/* Activities */}
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">
              {tab === "created" ? "📝" : "🎉"}
            </div>
            <p className="text-muted">
              {tab === "created"
                ? "Nu ai propus nicio activitate încă."
                : "Nu ai participat la nicio activitate încă."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const cat = getCategoryInfo(activity.category);
              const isPast = new Date(activity.date) < new Date();

              return (
                <button
                  key={activity.id}
                  onClick={() => router.push(`/activity/${activity.id}`)}
                  className={`w-full text-left bg-surface rounded-xl border border-border p-4 hover:shadow-md transition-all ${
                    isPast ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted">
                      {cat.icon} {cat.label}
                    </span>
                    <span
                      className={`text-xs font-medium ${isPast ? "text-muted" : "text-primary"}`}
                    >
                      {isPast ? "Trecut" : formatDate(activity.date)}
                    </span>
                  </div>
                  <h3 className="font-bold">{activity.title}</h3>
                  <p className="text-sm text-muted">{activity.location}</p>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
