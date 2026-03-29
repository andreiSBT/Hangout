"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Activity = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string;
  date: string;
  max_people: number;
  created_by: string;
  created_at: string;
};

type Participant = {
  activity_id: string;
};

const CATEGORIES = [
  { value: "sport", label: "Sport", icon: "⚽" },
  { value: "board-games", label: "Board Games", icon: "🎲" },
  { value: "outdoor", label: "În aer liber", icon: "🌳" },
  { value: "music", label: "Muzică", icon: "🎵" },
  { value: "art", label: "Artă", icon: "🎨" },
  { value: "food", label: "Mâncare", icon: "🍕" },
  { value: "study", label: "Învățare", icon: "📚" },
  { value: "other", label: "Altele", icon: "✨" },
];

function getCategoryInfo(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[7];
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Azi";
  if (days === 1) return "Mâine";
  if (days < 7) return `În ${days} zile`;

  return date.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [participantCounts, setParticipantCounts] = useState<
    Record<string, number>
  >({});
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "sport",
    location: "",
    date: "",
    max_people: 10,
    created_by: "",
  });

  useEffect(() => {
    fetchActivities();
  }, []);

  async function fetchActivities() {
    setLoading(true);
    const { data: acts } = await supabase
      .from("hangout_activities")
      .select("*")
      .gte("date", new Date().toISOString())
      .order("date", { ascending: true });

    if (acts) {
      setActivities(acts);

      const { data: parts } = await supabase
        .from("hangout_participants")
        .select("activity_id");

      if (parts) {
        const counts: Record<string, number> = {};
        (parts as Participant[]).forEach((p) => {
          counts[p.activity_id] = (counts[p.activity_id] || 0) + 1;
        });
        setParticipantCounts(counts);
      }
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("hangout_activities").insert([form]);
    if (!error) {
      setForm({
        title: "",
        description: "",
        category: "sport",
        location: "",
        date: "",
        max_people: 10,
        created_by: "",
      });
      setShowForm(false);
      fetchActivities();
    }
  }

  async function handleJoin(activityId: string) {
    const name = prompt("Cum te cheamă?");
    if (!name) return;

    const { error } = await supabase
      .from("hangout_participants")
      .insert([{ activity_id: activityId, name }]);

    if (!error) {
      setJoinedIds((prev) => new Set(prev).add(activityId));
      setParticipantCounts((prev) => ({
        ...prev,
        [activityId]: (prev[activityId] || 0) + 1,
      }));
    }
  }

  const filtered = filter
    ? activities.filter((a) => a.category === filter)
    : activities;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
              H
            </div>
            <span className="text-xl font-bold tracking-tight">Hangout</span>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-dark transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-95"
          >
            + Propune
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-light to-background pt-16 pb-20 px-4 sm:px-6">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />
        <div className="max-w-5xl mx-auto text-center relative">
          <h1 className="animate-fade-in text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
            Ieși din casă.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Fă-ți prieteni.
            </span>
          </h1>
          <p className="animate-slide-up mt-5 text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
            Propune o activitate, găsește oameni din zona ta și
            socializează în viața reală — nu doar online.
          </p>
          <div className="animate-slide-up mt-8 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setFilter(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === null
                  ? "bg-foreground text-background shadow-lg"
                  : "bg-surface text-muted hover:bg-surface-hover border border-border"
              }`}
            >
              Toate
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() =>
                  setFilter(filter === cat.value ? null : cat.value)
                }
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === cat.value
                    ? "bg-foreground text-background shadow-lg"
                    : "bg-surface text-muted hover:bg-surface-hover border border-border"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Activities List */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🌅</div>
            <h3 className="text-xl font-semibold mb-2">
              Nicio activitate încă
            </h3>
            <p className="text-muted mb-6">
              Fii primul care propune ceva! Lumea așteaptă.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-all hover:shadow-lg hover:shadow-primary/25"
            >
              Propune o activitate
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((activity, i) => {
              const cat = getCategoryInfo(activity.category);
              const count = participantCounts[activity.id] || 0;
              const isFull = count >= activity.max_people;
              const joined = joinedIds.has(activity.id);

              return (
                <div
                  key={activity.id}
                  className="animate-slide-up group bg-surface rounded-2xl border border-border p-5 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-0.5 transition-all"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-background rounded-lg text-xs font-medium text-muted">
                      {cat.icon} {cat.label}
                    </span>
                    <span className="text-xs font-medium text-primary">
                      {formatDate(activity.date)}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold mb-1 leading-snug">
                    {activity.title}
                  </h3>
                  {activity.description && (
                    <p className="text-sm text-muted mb-3 line-clamp-2">
                      {activity.description}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 text-sm text-muted mb-4">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {activity.location}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {Array.from({ length: Math.min(count, 3) }).map(
                          (_, j) => (
                            <div
                              key={j}
                              className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary border-2 border-surface"
                            />
                          )
                        )}
                      </div>
                      <span className="text-xs text-muted">
                        {count}/{activity.max_people}
                      </span>
                    </div>

                    {joined ? (
                      <span className="px-3 py-1.5 rounded-full text-xs font-semibold text-success bg-success/10">
                        Participi ✓
                      </span>
                    ) : isFull ? (
                      <span className="px-3 py-1.5 rounded-full text-xs font-semibold text-muted bg-background">
                        Complet
                      </span>
                    ) : (
                      <button
                        onClick={() => handleJoin(activity.id)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold text-primary bg-primary-light hover:bg-primary hover:text-white transition-all active:scale-95"
                      >
                        Participă
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        <div className="max-w-5xl mx-auto px-4">
          Făcut cu drag pentru o lume mai conectată.
        </div>
      </footer>

      {/* Create Activity Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-surface rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Propune o activitate</h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-muted hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Titlu
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Meci de fotbal în parc"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Descriere
                </label>
                <textarea
                  placeholder="Spune mai multe despre activitate..."
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Categorie
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() =>
                        setForm({ ...form, category: cat.value })
                      }
                      className={`p-2.5 rounded-xl text-center text-xs font-medium transition-all ${
                        form.category === cat.value
                          ? "bg-primary text-white shadow-md shadow-primary/25"
                          : "bg-background border border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="text-lg mb-0.5">{cat.icon}</div>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Locație
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Parcul Central"
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Nr. maxim persoane
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={100}
                    required
                    value={form.max_people}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        max_people: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Când?
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.date}
                    onChange={(e) =>
                      setForm({ ...form, date: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Numele tău
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Andrei"
                    value={form.created_by}
                    onChange={(e) =>
                      setForm({ ...form, created_by: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-[0.98]"
              >
                Publică activitatea
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
