"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Activity, getCategoryInfo, formatDate } from "@/lib/shared";
import { getLevel, getUnlockedBadges, BADGES, type UserStats } from "@/lib/badges";
import { useI18n } from "@/lib/i18n";
import Avatar from "@/components/Avatar";
import type { User } from "@supabase/supabase-js";

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

export default function ProfilePage() {
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [avgStars, setAvgStars] = useState(0);
  const [myActivities, setMyActivities] = useState<Activity[]>([]);
  const [joinedActivities, setJoinedActivities] = useState<Activity[]>([]);
  const [tab, setTab] = useState<"created" | "joined" | "settings">("created");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const [dark, setDark] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/"); return; }
      setUser(data.user);
      fetchProfile(data.user.id);
    });
  }, [router]);

  async function fetchProfile(userId: string) {
    setLoading(true);
    const { data: profile } = await supabase
      .from("hangout_profiles")
      .select("username, avatar_url, points, avg_stars")
      .eq("id", userId)
      .single();
    if (profile) {
      setUsername(profile.username);
      setAvatarUrl(profile.avatar_url);
      setPoints(profile.points ?? 0);
      setAvgStars(profile.avg_stars ?? 0);
    }

    const { data: created } = await supabase
      .from("hangout_activities").select("*").eq("user_id", userId).order("date", { ascending: false });
    if (created) setMyActivities(created);

    const { data: participations } = await supabase
      .from("hangout_participants").select("activity_id").eq("name", profile?.username ?? "");
    if (participations && participations.length > 0) {
      const ids = participations.map((p) => p.activity_id);
      const { data: joined } = await supabase
        .from("hangout_activities").select("*").in("id", ids).order("date", { ascending: false });
      if (joined) setJoinedActivities(joined);
    }
    setLoading(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { setToast("Doar imagini sunt permise."); return; }
    if (file.size > 2 * 1024 * 1024) { setToast("Max 2MB."); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { setToast("Eroare: " + uploadError.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl + "?t=" + Date.now();
    const { error: updateError } = await supabase.from("hangout_profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    if (!updateError) { setAvatarUrl(publicUrl); setToast(t("toast.picUpdated")); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function toggleDark() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("hangout-dark", String(next));
    if (next) { document.documentElement.classList.add("dark"); } else { document.documentElement.classList.remove("dark"); }
    document.body.style.display = "none";
    document.body.offsetHeight;
    document.body.style.display = "";
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    if (newPassword.length < 6) { setPasswordError("Minim 6 caractere."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Parolele nu se potrivesc."); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) { setPasswordError(error.message); return; }
    setNewPassword(""); setConfirmPassword("");
    setToast(t("toast.pwdChanged"));
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push("/"); }

  const activities = tab === "created" ? myActivities : joinedActivities;
  const stats: UserStats = { points, activitiesCreated: myActivities.length, activitiesJoined: joinedActivities.length, avgStars: avgStars };
  const level = getLevel(points);
  const unlockedBadges = getUnlockedBadges(stats);

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
          <button onClick={() => router.push("/")} className="flex items-center gap-2 text-muted hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            <span className="text-sm font-medium">{t("nav.back")}</span>
          </button>
          <span className="text-lg font-bold tracking-tight">{t("profile.title")}</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile Header */}
        <div className="relative bg-surface rounded-2xl border border-border overflow-hidden mb-6 animate-fade-in">
          <div className="h-24 bg-gradient-to-r from-primary via-secondary to-primary" />
          <div className="px-4 sm:px-8 pb-5 sm:pb-6">
            <div className="-mt-8 sm:-mt-10">
              <Avatar src={avatarUrl} name={username} size="lg" className="ring-4 ring-surface shadow-xl !rounded-2xl border-2 border-surface" />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold">{username}</h1>
                <p className="text-sm text-muted mt-0.5">{user?.email}</p>
              </div>
              <div className="ml-auto px-3 py-1 rounded-full bg-primary-light text-primary text-xs font-bold">
                {lang === "ro" ? level.name : level.nameEn} · Lv.{level.level}
              </div>
            </div>

            {/* Level progress */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted mb-1">
                <span>{points} pts</span>
                <span>{level.nextAt} pts</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style={{ width: `${level.progress}%` }} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 sm:gap-5 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center">
                  <span className="text-base font-bold text-primary">{myActivities.length}</span>
                </div>
                <div className="text-xs text-muted leading-tight">{t("profile.activities")}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-secondary-light flex items-center justify-center">
                  <span className="text-base font-bold text-secondary">{joinedActivities.length}</span>
                </div>
                <div className="text-xs text-muted leading-tight">{t("profile.participations")}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                  <span className="text-base font-bold text-success">{points}</span>
                </div>
                <div className="text-xs text-muted leading-tight">Puncte</div>
              </div>
            </div>
            <button
              onClick={() => router.push("/friends")}
              className="mt-4 w-full py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-muted hover:text-foreground hover:border-foreground/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {t("profile.friends")}
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="bg-surface rounded-2xl border border-border p-5 mb-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">{t("profile.badges")}</h2>
          {BADGES.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {BADGES.map((badge) => {
                const unlocked = unlockedBadges.some((b) => b.id === badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      unlocked
                        ? "bg-primary-light text-primary"
                        : "bg-background text-muted opacity-40"
                    }`}
                    title={lang === "ro" ? badge.description : badge.descriptionEn}
                  >
                    <span className="text-base">{badge.icon}</span>
                    {lang === "ro" ? badge.name : badge.nameEn}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface rounded-xl border border-border mb-6">
          {(["created", "joined", "settings"] as const).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-95 ${
                tab === tb ? "bg-foreground text-background shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              {tb === "created" ? t("profile.activities") : tb === "joined" ? t("profile.participations") : t("profile.settings")}
            </button>
          ))}
        </div>

        {/* Settings */}
        {tab === "settings" ? (
          <div className="space-y-4 animate-fade-in">
            {/* Profile Picture */}
            <div className="bg-surface rounded-2xl border border-border p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">{t("settings.profilePic")}</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar src={avatarUrl} name={username} size="xl" className="ring-2 ring-border" />
                  {uploading && (
                    <div className="absolute inset-0 rounded-full bg-foreground/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted mb-3">{t("settings.picDesc")}</p>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} className="px-4 py-2 bg-foreground text-background rounded-xl text-sm font-semibold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50">
                    {uploading ? "..." : avatarUrl ? t("settings.changePic") : t("settings.uploadPic")}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </div>
              </div>
            </div>

            {/* Account */}
            <div className="bg-surface rounded-2xl border border-border p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">{t("settings.account")}</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted mb-0.5">Username</div>
                    <div className="font-semibold">{username}</div>
                  </div>
                  <Avatar src={avatarUrl} name={username} size="md" />
                </div>
                <div className="border-t border-border" />
                <div>
                  <div className="text-xs text-muted mb-0.5">Email</div>
                  <div className="font-semibold">{user?.email}</div>
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="bg-surface rounded-2xl border border-border p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">{t("settings.appearance")}</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center">
                      {dark ? (
                        <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                      ) : (
                        <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{t("settings.darkMode")}</div>
                      <div className="text-xs text-muted">{dark ? t("settings.darkOn") : t("settings.darkOff")}</div>
                    </div>
                  </div>
                  <button onClick={toggleDark} className={`relative w-12 h-7 rounded-full transition-colors ${dark ? "bg-primary" : "bg-border"}`}>
                    <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${dark ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
                <div className="border-t border-border" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-lg">
                      🌐
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{t("settings.language")}</div>
                      <div className="text-xs text-muted">{lang === "ro" ? "Română" : "English"}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 p-0.5 bg-background rounded-lg">
                    <button onClick={() => setLang("ro")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${lang === "ro" ? "bg-foreground text-background" : "text-muted"}`}>
                      RO
                    </button>
                    <button onClick={() => setLang("en")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${lang === "en" ? "bg-foreground text-background" : "text-muted"}`}>
                      EN
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="bg-surface rounded-2xl border border-border p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">{t("settings.changePwd")}</h2>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <input type="password" required minLength={6} placeholder={t("settings.newPwd")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                <input type="password" required minLength={6} placeholder={t("settings.confirmPwd")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                {passwordError && <div className="text-sm text-danger bg-danger-light px-4 py-2.5 rounded-xl">{passwordError}</div>}
                <button type="submit" disabled={changingPassword} className="w-full py-2.5 bg-foreground text-background rounded-xl text-sm font-semibold hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50">
                  {changingPassword ? t("settings.changingPwd") : t("settings.changePwdBtn")}
                </button>
              </form>
            </div>

            <button onClick={handleLogout} className="w-full py-3 bg-surface rounded-2xl border border-border text-danger text-sm font-semibold hover:bg-danger-light transition-all active:scale-[0.98]">
              {t("settings.logout")}
            </button>
          </div>
        ) : (
          <>
            {activities.length === 0 ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="text-5xl mb-4">{tab === "created" ? "📝" : "🎉"}</div>
                <h3 className="text-xl font-bold mb-2">{tab === "created" ? t("profile.noCreated") : t("profile.noJoined")}</h3>
                <button onClick={() => router.push("/")} className="mt-4 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-full font-semibold hover:shadow-lg transition-all active:scale-95">
                  {t("activity.propose")}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity, i) => {
                  const cat = getCategoryInfo(activity.category);
                  const isPast = new Date(activity.date) < new Date();
                  return (
                    <button key={activity.id} onClick={() => router.push(`/activity/${activity.id}`)} className={`w-full text-left bg-surface rounded-xl border border-border p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-slide-up group ${isPast ? "opacity-50" : ""}`} style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-background rounded-lg text-xs font-medium text-muted">{cat.icon} {cat.label}</span>
                        <span className={`text-xs font-medium ${isPast ? "text-muted" : "text-primary"}`}>{isPast ? t("activity.past") : formatDate(activity.date)}</span>
                      </div>
                      <h3 className="font-bold group-hover:text-primary transition-colors">{activity.title}</h3>
                      <div className="flex items-center gap-1.5 text-sm text-muted mt-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {activity.location}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {toast && <Toast message={toast} onDone={clearToast} />}
    </div>
  );
}
