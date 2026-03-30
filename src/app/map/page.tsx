"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Activity, getCategoryInfo, formatDate } from "@/lib/shared";
import { useI18n } from "@/lib/i18n";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("hangout_activities")
      .select("*")
      .gte("date", new Date().toISOString())
      .not("lat", "is", null)
      .order("date", { ascending: true })
      .then(({ data }) => {
        if (data) setActivities(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 text-muted hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            <span className="text-sm font-medium">{t("nav.back")}</span>
          </button>
          <span className="text-lg font-bold">Hartă</span>
          <div className="w-16" />
        </div>
      </header>

      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="text-5xl mb-4">🗺️</div>
            <h3 className="text-xl font-bold mb-2">Nicio activitate pe hartă</h3>
            <p className="text-muted text-sm">Activitățile cu coordonate GPS vor apărea aici.</p>
          </div>
        ) : (
          <MapView activities={activities} onSelect={(id) => router.push(`/activity/${id}`)} />
        )}
      </div>
    </div>
  );
}
