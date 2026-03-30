"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Activity, CATEGORIES, getCategoryInfo, formatDate, timeAgo } from "@/lib/shared";
import { translateText } from "@/lib/translate";
import AuthModal from "@/components/AuthModal";
import Avatar from "@/components/Avatar";
import { useI18n } from "@/lib/i18n";
import type { User } from "@supabase/supabase-js";

type FeedItem = {
  id: string;
  username: string;
  action: string;
  activity_title: string | null;
  activity_id: string | null;
  created_at: string;
};

type Participant = {
  activity_id: string;
};

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-2xl border border-border p-5">
      <div className="flex justify-between mb-3">
        <div className="skeleton h-6 w-20" />
        <div className="skeleton h-4 w-16" />
      </div>
      <div className="skeleton h-6 w-3/4 mb-2" />
      <div className="skeleton h-4 w-full mb-1" />
      <div className="skeleton h-4 w-2/3 mb-4" />
      <div className="skeleton h-4 w-1/2 mb-4" />
      <div className="border-t border-border pt-3 flex justify-between">
        <div className="skeleton h-6 w-20" />
        <div className="skeleton h-7 w-24 rounded-full" />
      </div>
    </div>
  );
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2200);
    const t2 = setTimeout(onDone, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]">
      <div
        className={`px-5 py-3 rounded-2xl bg-foreground text-background text-sm font-medium shadow-2xl ${
          leaving ? "animate-toast-out" : "animate-toast-in"
        }`}
      >
        {message}
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [participantCounts, setParticipantCounts] = useState<
    Record<string, number>
  >({});
  const [showForm, setShowForm] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [rare] = useState(() => Math.random() < 0.001);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ageFilter, setAgeFilter] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "sport",
    customCategory: "",
    location: "",
    max_people: 10,
    min_age: 10,
    max_age: 99,
    created_by: "",
    recurrence: "",
  });

  const [dateFields, setDateFields] = useState({
    day: "",
    month: "",
    year: "",
    hour: "",
    minute: "",
  });

  useEffect(() => {
    let ignoreFirstEvent = true;

    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      let uname: string | null = null;
      if (data.user) uname = await fetchUsername(data.user.id);
      fetchActivities(uname);
      setAuthReady(true);
      setTimeout(() => { ignoreFirstEvent = false; }, 100);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (ignoreFirstEvent && _event === "INITIAL_SESSION") return;
        setUser(session?.user ?? null);
        let uname: string | null = null;
        if (session?.user) {
          uname = await fetchUsername(session.user.id);
        } else {
          setUsername(null);
          setAvatarUrl(null);
        }
        fetchActivities(uname);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchUsername(userId: string) {
    const { data } = await supabase
      .from("hangout_profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .single();
    if (data) {
      setUsername(data.username);
      setAvatarUrl(data.avatar_url);
      return data.username;
    }
    return null;
  }

  async function fetchActivities(uname?: string | null) {
    setLoading(true);
    const currentUsername = uname ?? username;
    const { data: acts } = await supabase
      .from("hangout_activities")
      .select("*")
      .gte("date", new Date().toISOString())
      .order("date", { ascending: true });

    if (acts) {
      setActivities(acts);
      const { data: parts } = await supabase
        .from("hangout_participants")
        .select("activity_id, name");
      if (parts) {
        const counts: Record<string, number> = {};
        const myJoined = new Set<string>();
        (parts as { activity_id: string; name: string }[]).forEach((p) => {
          counts[p.activity_id] = (counts[p.activity_id] || 0) + 1;
          if (currentUsername && p.name === currentUsername) myJoined.add(p.activity_id);
        });
        setParticipantCounts(counts);
        setJoinedIds(myJoined);
      }
    }
    // Fetch feed
    const { data: feedData } = await supabase
      .from("hangout_feed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (feedData) setFeed(feedData);

    setLoading(false);
  }

  function handlePropune() {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setForm((prev) => ({ ...prev, created_by: username ?? "" }));
    setShowForm(true);
  }

  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    const { day, month, year, hour, minute } = dateFields;
    const dateStr = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00`;
    const { customCategory, recurrence, ...formData } = form;

    // Translate title and description to English
    const [titleEn, descEn] = await Promise.all([
      translateText(form.title, "ro", "en"),
      form.description ? translateText(form.description, "ro", "en") : Promise.resolve(""),
    ]);

    const insertData = {
      ...formData,
      category: form.category === "other" && customCategory ? customCategory : form.category,
      date: dateStr,
      user_id: user?.id,
      recurrence: recurrence || null,
      title_en: titleEn || null,
      description_en: descEn || null,
    };
    const { error } = await supabase
      .from("hangout_activities")
      .insert([insertData]);
    setSubmitting(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setForm({
      title: "",
      description: "",
      category: "sport",
      customCategory: "",
      location: "",
      max_people: 10,
      min_age: 10,
      max_age: 99,
      created_by: "",
      recurrence: "",
    });
    setDateFields({ day: "", month: "", year: "", hour: "", minute: "" });
    setShowForm(false);
    // Feed entry
    await supabase.from("hangout_feed").insert([{ username, action: "created", activity_title: form.title }]);
    setToast(t("toast.published"));
    fetchActivities();
  }

  async function handleJoin(activityId: string) {
    if (!user) {
      setShowAuth(true);
      return;
    }
    const name = username ?? t("misc.anonymous");
    const { error } = await supabase
      .from("hangout_participants")
      .insert([{ activity_id: activityId, name }]);
    if (!error) {
      setJoinedIds((prev) => new Set(prev).add(activityId));
      setParticipantCounts((prev) => ({
        ...prev,
        [activityId]: (prev[activityId] || 0) + 1,
      }));
      await supabase.rpc("add_points", { user_username: username, amount: 10 });
      const act = activities.find((a) => a.id === activityId);
      if (act) await supabase.from("hangout_feed").insert([{ username, action: "joined", activity_id: activityId, activity_title: act.title }]);
      setToast(t("toast.joined"));
    }
  }

  async function handleLeave(activityId: string) {
    if (!username) return;
    const { error } = await supabase
      .from("hangout_participants")
      .delete()
      .eq("activity_id", activityId)
      .eq("name", username);
    if (!error) {
      setJoinedIds((prev) => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });
      setParticipantCounts((prev) => ({
        ...prev,
        [activityId]: Math.max((prev[activityId] || 1) - 1, 0),
      }));
      // -10 puncte
      await supabase.rpc("add_points", { user_username: username, amount: -10 });
      setToast(t("toast.left"));
    }
  }

  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function confirmDelete() {
    if (!deleteId) return;
    const { error } = await supabase
      .from("hangout_activities")
      .delete()
      .eq("id", deleteId);
    if (!error) {
      setActivities((prev) => prev.filter((a) => a.id !== deleteId));
      setToast(t("toast.deleted"));
    }
    setDeleteId(null);
  }

  const clearToast = useCallback(() => setToast(null), []);

  const filtered = activities
    .filter((a) => (filter ? a.category === filter : true))
    .filter((a) => {
      if (!search) return true;
      const s = search.toLowerCase();
      const cat = getCategoryInfo(a.category);
      const dateStr = formatDate(a.date).toLowerCase();
      return (
        a.title.toLowerCase().includes(s) ||
        a.location.toLowerCase().includes(s) ||
        a.created_by.toLowerCase().includes(s) ||
        cat.label.toLowerCase().includes(s) ||
        cat.labelEn.toLowerCase().includes(s) ||
        dateStr.includes(s) ||
        (a.description?.toLowerCase().includes(s) ?? false)
      );
    })
    .filter((a) => {
      if (dateFrom && new Date(a.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(a.date) > new Date(dateTo + "T23:59:59")) return false;
      if (ageFilter) {
        const age = parseInt(ageFilter);
        if (!isNaN(age) && (age < a.min_age || age > a.max_age)) return false;
      }
      return true;
    });

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => { setFilter(null); setSearch(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20">
              H
            </div>
            <span className="text-xl font-bold tracking-tight hidden sm:block">Hangout</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/map")}
              className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-muted hover:text-foreground hover:border-foreground/20 transition-all active:scale-90"
              title={t("misc.map")}
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            </button>
            {!authReady ? (
              <div className="w-9 h-9" />
            ) : user ? (
              <button
                onClick={() => router.push("/profile")}
                className="hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-90 ring-2 ring-background rounded-full"
                title="Profilul meu"
              >
                <Avatar src={avatarUrl} name={username} size="md" />
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="px-3 sm:px-4 py-2 border border-border rounded-full text-xs sm:text-sm font-medium hover:bg-surface-hover hover:border-foreground/20 transition-all active:scale-95"
              >
                {t("nav.login")}
              </button>
            )}
            <button
              onClick={handlePropune}
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-xs sm:text-sm font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95"
            >
              <span className="sm:hidden">{t("nav.proposeMobile")}</span>
              <span className="hidden sm:inline">{t("nav.propose")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-light to-background pt-10 sm:pt-16 pb-12 sm:pb-20 px-4 sm:px-6">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="max-w-5xl mx-auto text-center relative">
          <h1 className="animate-fade-in text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
            {t("hero.title1")}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              {rare ? t("hero.title2rare") : t("hero.title2")}
            </span>
          </h1>
          <p className="animate-slide-up mt-4 sm:mt-5 text-base sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
            {t("hero.subtitle")}
          </p>

          {/* Search */}
          <div className="animate-slide-up mt-8 max-w-md mx-auto">
            <div className="relative group">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t("hero.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-sm transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background flex items-center justify-center text-muted hover:text-foreground text-xs transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="animate-slide-up mt-4 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setFilter(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                filter === null
                  ? "bg-foreground text-background shadow-lg"
                  : "bg-surface text-muted hover:bg-surface-hover border border-border"
              }`}
            >
              {t("hero.all")}
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilter(filter === cat.value ? null : cat.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                  filter === cat.value
                    ? "bg-foreground text-background shadow-lg"
                    : "bg-surface text-muted hover:bg-surface-hover border border-border"
                }`}
              >
                {cat.icon} {lang === "en" ? cat.labelEn : cat.label}
              </button>
            ))}
            {/* Advanced filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${showFilters ? "bg-primary text-white" : "bg-surface text-muted hover:bg-surface-hover border border-border"}`}
            >
              <svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              {t("filter.advanced")}
            </button>
          </div>

          {/* Advanced filters panel */}
          {showFilters && (
            <div className="animate-slide-up mt-4 max-w-md mx-auto flex flex-wrap gap-2 justify-center">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 rounded-xl border border-border bg-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder={t("filter.dateFrom")} />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 rounded-xl border border-border bg-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder={t("filter.dateTo")} />
              <input type="number" value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} placeholder={t("filter.ageRange")} min={5} max={99} className="px-3 py-2 rounded-xl border border-border bg-surface text-xs w-20 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              {(dateFrom || dateTo || ageFilter) && (
                <button onClick={() => { setDateFrom(""); setDateTo(""); setAgeFilter(""); }} className="px-3 py-2 rounded-xl text-xs font-medium text-danger hover:bg-danger-light transition-all">
                  {t("filter.clear")}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Activities */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
        {/* Feed */}
        {feed.length > 0 && !search && !filter && (
          <div className="mb-8 animate-fade-in">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">{t("feed.title")}</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {feed.map((f) => (
                <button
                  key={f.id}
                  onClick={() => f.activity_id && router.push(`/activity/${f.activity_id}`)}
                  className="flex-shrink-0 bg-surface border border-border rounded-xl p-3 text-left hover:shadow-md transition-all max-w-[200px]"
                >
                  <div className="text-xs text-muted mb-1">{timeAgo(f.created_at)}</div>
                  <div className="text-sm">
                    <span className="font-semibold">{f.username}</span>{" "}
                    <span className="text-muted">{f.action === "joined" ? t("feed.joined") : t("feed.created")}</span>{" "}
                    <span className="font-medium text-primary">{f.activity_title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="text-5xl sm:text-6xl mb-4 sm:mb-5">{search ? "🔍" : "🌅"}</div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">
              {search ? t("activity.noResults") : t("activity.none")}
            </h3>
            <p className="text-muted mb-8 max-w-sm mx-auto">
              {search
                ? `"${search}"`
                : t("activity.noneDesc")}
            </p>
            {!search && (
              <button
                onClick={handlePropune}
                className="px-8 py-3.5 bg-gradient-to-r from-primary to-secondary text-white rounded-full font-semibold hover:shadow-xl hover:shadow-primary/25 transition-all active:scale-95"
              >
                {t("activity.propose")}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-muted">
                {filtered.length} {filtered.length === 1 ? t("filter.result") : t("filter.results")}
                {filter ? ` ${t("misc.in")} ${lang === "en" ? getCategoryInfo(filter).labelEn : getCategoryInfo(filter).label}` : ""}
                {search ? ` ${t("misc.for")} "${search}"` : ""}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((activity, i) => {
                const cat = getCategoryInfo(activity.category);
                const count = participantCounts[activity.id] || 0;
                const isFull = count >= activity.max_people;
                const joined = joinedIds.has(activity.id);
                const isOwner = user && activity.user_id === user.id;
                const spotsLeft = activity.max_people - count;

                return (
                  <div
                    key={activity.id}
                    className="animate-slide-up group bg-surface rounded-2xl border border-border p-5 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
                    style={{ animationDelay: `${i * 60}ms` }}
                    onClick={() => router.push(`/activity/${activity.id}`)}
                  >
                    {/* Urgency badge */}
                    {spotsLeft <= 2 && spotsLeft > 0 && !joined && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-primary to-primary/80 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                        {spotsLeft === 1 ? t("activity.lastSpot") : `${spotsLeft} ${t("activity.spots")}`}
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-background rounded-lg text-xs font-medium text-muted">
                        {cat.icon} {lang === "en" ? cat.labelEn : cat.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-primary">
                          {formatDate(activity.date)}
                        </span>
                        {isOwner && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(activity.id);
                            }}
                            className="w-6 h-6 rounded-full bg-background flex items-center justify-center text-muted hover:text-danger hover:bg-danger-light transition-colors opacity-0 group-hover:opacity-100"
                            title={t("misc.deleteActivity")}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="text-lg font-bold mb-1 leading-snug group-hover:text-primary transition-colors">
                      {lang === "en" && activity.title_en ? activity.title_en : activity.title}
                    </h3>
                    {activity.description && (
                      <p className="text-sm text-muted mb-3 line-clamp-2">
                        {lang === "en" && activity.description_en ? activity.description_en : activity.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted mb-4">
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {activity.location}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {activity.min_age}–{activity.max_age} {t("activity.age")}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="h-1.5 bg-background rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                          style={{ width: `${Math.min((count / activity.max_people) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                          {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                            <div
                              key={j}
                              className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary border-2 border-surface"
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted font-medium">
                          {count}/{activity.max_people}
                        </span>
                      </div>

                      {joined ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLeave(activity.id);
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold text-success bg-success/10 hover:text-danger hover:bg-danger-light transition-all active:scale-95 flex items-center gap-1 group/leave"
                        >
                          <svg className="w-3 h-3 group-hover/leave:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <svg className="w-3 h-3 hidden group-hover/leave:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="group-hover/leave:hidden">{t("activity.joined")}</span>
                          <span className="hidden group-hover/leave:inline">{t("activity.leave")}</span>
                        </button>
                      ) : isFull ? (
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold text-muted bg-background">
                          {t("activity.full")}
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoin(activity.id);
                          }}
                          className="px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-primary to-primary-dark hover:shadow-md hover:shadow-primary/25 transition-all active:scale-95"
                        >
                          {t("activity.join")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-10 text-center">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-[10px]">
              H
            </div>
            <span className="font-bold">Hangout</span>
          </div>
          <p className="text-sm text-muted">
            {t("footer.text")}
          </p>
        </div>
      </footer>

      {/* Toast */}
      {toast && <Toast message={toast} onDone={clearToast} />}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setDeleteId(null)}
          />
          <div className="relative bg-surface rounded-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <div className="w-14 h-14 rounded-full bg-danger-light flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-1">{t("delete.title")}</h3>
            <p className="text-sm text-muted mb-6">
              {t("delete.desc")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-surface-hover transition-all active:scale-95"
              >
                {t("delete.cancel")}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-danger text-white text-sm font-medium hover:bg-danger/80 transition-all active:scale-95"
              >
                {t("delete.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuth={() => {
            setShowAuth(false);
            setToast(t("toast.welcome"));
          }}
        />
      )}

      {/* Create Activity Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-surface rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{t("form.title")}</h2>
                <p className="text-sm text-muted mt-0.5">{t("form.subtitle")}</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-9 h-9 rounded-full bg-background flex items-center justify-center text-muted hover:text-foreground transition-colors active:scale-90"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("form.name")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("form.namePlaceholder")}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">{t("form.description")}</label>
                <textarea
                  placeholder={t("form.descPlaceholder")}
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">{t("form.category")}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setForm({ ...form, category: cat.value })}
                      className={`p-2.5 rounded-xl text-center text-xs font-medium transition-all active:scale-95 ${
                        form.category === cat.value
                          ? "bg-primary text-white shadow-md shadow-primary/25 ring-2 ring-primary/30"
                          : "bg-background border border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="text-lg mb-0.5">{cat.icon}</div>
                      {lang === "en" ? cat.labelEn : cat.label}
                    </button>
                  ))}
                </div>
                {form.category === "other" && (
                  <input
                    type="text"
                    required
                    placeholder={t("form.customCategory")}
                    value={form.customCategory}
                    onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t("form.location")}</label>
                  <input
                    type="text"
                    required
                    placeholder={t("form.locationPlaceholder")}
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t("form.maxPeople")}</label>
                  <input
                    type="number"
                    min={2}
                    max={100}
                    required
                    value={form.max_people}
                    onChange={(e) => setForm({ ...form, max_people: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t("form.minAge")}</label>
                  <input
                    type="number"
                    min={5}
                    max={99}
                    required
                    value={form.min_age}
                    onChange={(e) => setForm({ ...form, min_age: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t("form.maxAge")}</label>
                  <input
                    type="number"
                    min={5}
                    max={99}
                    required
                    value={form.max_age}
                    onChange={(e) => setForm({ ...form, max_age: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">{t("form.date")}</label>
                <div className="grid grid-cols-3 gap-2">
                  <select required value={dateFields.day} onChange={(e) => setDateFields({ ...dateFields, day: e.target.value })} className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
                    <option value="">{t("date.day")}</option>
                    {Array.from({ length: 31 }, (_, i) => (<option key={i + 1} value={String(i + 1)}>{i + 1}</option>))}
                  </select>
                  <select required value={dateFields.month} onChange={(e) => setDateFields({ ...dateFields, month: e.target.value })} className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
                    <option value="">{t("date.month")}</option>
                    {t("date.months").split(",").map((m, i) => (<option key={i + 1} value={String(i + 1)}>{m}</option>))}
                  </select>
                  <select required value={dateFields.year} onChange={(e) => setDateFields({ ...dateFields, year: e.target.value })} className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
                    <option value="">{t("date.year")}</option>
                    {[2026, 2027].map((y) => (<option key={y} value={String(y)}>{y}</option>))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">{t("form.time")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <select required value={dateFields.hour} onChange={(e) => setDateFields({ ...dateFields, hour: e.target.value })} className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
                    <option value="">{t("date.hour")}</option>
                    {Array.from({ length: 24 }, (_, i) => (<option key={i} value={String(i)}>{String(i).padStart(2, "0")}</option>))}
                  </select>
                  <select required value={dateFields.minute} onChange={(e) => setDateFields({ ...dateFields, minute: e.target.value })} className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
                    <option value="">{t("date.minute")}</option>
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (<option key={m} value={String(m)}>{String(m).padStart(2, "0")}</option>))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">{t("form.recurrence")}</label>
                <select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
                  <option value="">{t("form.recNone")}</option>
                  <option value="weekly">{t("form.recWeekly")}</option>
                  <option value="biweekly">{t("form.recBiweekly")}</option>
                  <option value="monthly">{t("form.recMonthly")}</option>
                </select>
              </div>

              {formError && (
                <p className="text-sm text-danger bg-danger-light px-4 py-2.5 rounded-xl">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? t("form.publishing") : t("form.publish")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
