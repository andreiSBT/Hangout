"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

const FEATURES = [
  { icon: "🎯", titleRo: "Propune activități", titleEn: "Propose activities", descRo: "Creează o activitate și invită oameni din zona ta.", descEn: "Create an activity and invite people nearby." },
  { icon: "👥", titleRo: "Găsește oameni", titleEn: "Find people", descRo: "Descoperă activități în zona ta și alătură-te.", descEn: "Discover activities near you and join." },
  { icon: "⭐", titleRo: "Câștigă puncte", titleEn: "Earn points", descRo: "Participă la activități și urcă în clasament.", descEn: "Join activities and climb the leaderboard." },
  { icon: "🏆", titleRo: "Deblochează badge-uri", titleEn: "Unlock badges", descRo: "Colectează badge-uri pe măsură ce socializezi.", descEn: "Collect badges as you socialize." },
  { icon: "💬", titleRo: "Chat în timp real", titleEn: "Real-time chat", descRo: "Comunică cu participanții direct în aplicație.", descEn: "Chat with participants directly in the app." },
  { icon: "🗺️", titleRo: "Hartă interactivă", titleEn: "Interactive map", descRo: "Vizualizează activitățile pe hartă.", descEn: "View activities on a map." },
];

export default function WelcomePage() {
  const router = useRouter();
  const { lang } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-light to-background px-4 sm:px-6">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />
        <div className="max-w-4xl mx-auto text-center relative pt-20 sm:pt-32 pb-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-3xl mx-auto mb-8 shadow-xl shadow-primary/20 animate-fade-in">
            H
          </div>
          <h1 className="animate-fade-in text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05]">
            {lang === "ro" ? "Socializează" : "Socialize"}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              {lang === "ro" ? "în viața reală" : "in real life"}
            </span>
          </h1>
          <p className="animate-slide-up mt-6 text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
            {lang === "ro"
              ? "Hangout conectează oameni din aceeași zonă pentru activități în viața reală. Fără scroll infinit, fără like-uri — doar conexiuni reale."
              : "Hangout connects people nearby for real-life activities. No infinite scroll, no likes — just real connections."}
          </p>
          <div className="animate-slide-up mt-10 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-primary/25 transition-all active:scale-95"
            >
              {lang === "ro" ? "Explorează activități" : "Explore activities"} →
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold mb-12">
          {lang === "ro" ? "De ce Hangout?" : "Why Hangout?"}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold mb-2">{lang === "ro" ? f.titleRo : f.titleEn}</h3>
              <p className="text-sm text-muted leading-relaxed">{lang === "ro" ? f.descRo : f.descEn}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-primary to-secondary py-20 px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            {lang === "ro" ? "Gata de aventură?" : "Ready for adventure?"}
          </h2>
          <p className="text-lg opacity-90 mb-8">
            {lang === "ro"
              ? "Alătură-te comunității Hangout și începe să socializezi în viața reală."
              : "Join the Hangout community and start socializing in real life."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-8 py-4 bg-white text-primary rounded-2xl font-bold text-lg hover:shadow-xl transition-all active:scale-95"
          >
            {lang === "ro" ? "Începe acum" : "Start now"} →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 text-center">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-[10px]">H</div>
            <span className="font-bold">Hangout</span>
          </div>
          <p className="text-sm text-muted">
            {lang === "ro" ? "Făcut cu drag pentru o lume mai conectată." : "Made with love for a more connected world."}
          </p>
        </div>
      </footer>
    </div>
  );
}
