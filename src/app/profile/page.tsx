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
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
            <div className="skeleton w-8 h-8 rounded-full" />
            <div className="skeleton h-5 w-28" />
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-surface rounded-2xl border border-border p-8 text-center">
            <div className="skeleton w-20 h-20 rounded-full mx-auto mb-4" />
            <div className="skeleton h-7 w-32 mx-auto mb-2" />
            <div className="skeleton h-4 w-40 mx-auto" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
          <span className="text-lg font-bold tracking-tight">Profilul meu</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile Header */}
        <div className="relative bg-surface rounded-2xl border border-border overflow-hidden mb-6 animate-fade-in">
          {/* Gradient banner */}
          <div className="h-24 bg-gradient-to-r from-primary via-secondary to-primary" />

          <div className="px-4 sm:px-8 pb-5 sm:pb-6">
            {/* Avatar */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl sm:text-3xl font-bold -mt-8 sm:-mt-10 ring-4 ring-surface shadow-xl">
              {username?.[0]?.toUpperCase() ?? "?"}
            </div>

            <div className="mt-4">
              <h1 className="text-xl sm:text-2xl font-extrabold">{username}</h1>
              <p className="text-sm text-muted mt-0.5">{user?.email}</p>
            </div>

            <div className="flex gap-4 sm:gap-6 mt-4 sm:mt-5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{myActivities.length}</span>
                </div>
                <div className="text-xs text-muted leading-tight">
                  Activități<br />create
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-secondary-light flex items-center justify-center">
                  <span className="text-lg font-bold text-secondary">{joinedActivities.length}</span>
                </div>
                <div className="text-xs text-muted leading-tight">
                  Activități<br />participări
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface rounded-xl border border-border mb-6">
          <button
            onClick={() => setTab("created")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-95 ${
              tab === "created"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Activitățile mele
          </button>
          <button
            onClick={() => setTab("joined")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-95 ${
              tab === "joined"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Participări
          </button>
        </div>

        {/* Activities */}
        {activities.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-5xl mb-4">
              {tab === "created" ? "📝" : "🎉"}
            </div>
            <h3 className="text-xl font-bold mb-2">
              {tab === "created"
                ? "Nu ai propus nicio activitate"
                : "Nu ai participat la nimic încă"}
            </h3>
            <p className="text-muted mb-6 max-w-sm mx-auto">
              {tab === "created"
                ? "Propune prima ta activitate și invită-ți prietenii!"
                : "Explorează activitățile disponibile și alătură-te!"}
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-full font-semibold hover:shadow-lg transition-all active:scale-95"
            >
              {tab === "created" ? "Propune o activitate" : "Explorează activități"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity, i) => {
              const cat = getCategoryInfo(activity.category);
              const isPast = new Date(activity.date) < new Date();

              return (
                <button
                  key={activity.id}
                  onClick={() => router.push(`/activity/${activity.id}`)}
                  className={`w-full text-left bg-surface rounded-xl border border-border p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-slide-up group ${
                    isPast ? "opacity-50" : ""
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-background rounded-lg text-xs font-medium text-muted">
                      {cat.icon} {cat.label}
                    </span>
                    <span className={`text-xs font-medium ${isPast ? "text-muted" : "text-primary"}`}>
                      {isPast ? "Trecut" : formatDate(activity.date)}
                    </span>
                  </div>
                  <h3 className="font-bold group-hover:text-primary transition-colors">
                    {activity.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted mt-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {activity.location}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
