"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Lang = "ro" | "en";

const translations = {
  // Header
  "nav.login": { ro: "Intră", en: "Login" },
  "nav.propose": { ro: "+ Propune", en: "+ Propose" },
  "nav.proposeMobile": { ro: "+", en: "+" },
  "nav.back": { ro: "Înapoi", en: "Back" },

  // Hero
  "hero.title1": { ro: "Ieși din casă.", en: "Go outside." },
  "hero.title2": { ro: "Fă-ți prieteni.", en: "Make friends." },
  "hero.title2rare": { ro: "Atinge iarbă.", en: "Touch grass." },
  "hero.subtitle": {
    ro: "Propune o activitate, găsește oameni din zona ta și socializează în viața reală — nu doar online.",
    en: "Propose an activity, find people nearby and socialize in real life — not just online.",
  },
  "hero.search": { ro: "Caută după nume, locație, categorie, dată...", en: "Search by name, location, category, date..." },
  "hero.all": { ro: "Toate", en: "All" },

  // Activities
  "activity.none": { ro: "Nicio activitate încă", en: "No activities yet" },
  "activity.noneDesc": { ro: "Fii primul care propune ceva! Comunitatea ta așteaptă.", en: "Be the first to propose something! Your community awaits." },
  "activity.noResults": { ro: "Niciun rezultat", en: "No results" },
  "activity.propose": { ro: "Propune o activitate", en: "Propose an activity" },
  "activity.join": { ro: "Participă", en: "Join" },
  "activity.joined": { ro: "Participi", en: "Joined" },
  "activity.leave": { ro: "Părăsește", en: "Leave" },
  "activity.full": { ro: "Complet", en: "Full" },
  "activity.lastSpot": { ro: "Ultimul loc!", en: "Last spot!" },
  "activity.spots": { ro: "locuri", en: "spots" },
  "activity.age": { ro: "ani", en: "y/o" },
  "activity.past": { ro: "Trecut", en: "Past" },

  // Create form
  "form.title": { ro: "Propune o activitate", en: "Propose an activity" },
  "form.subtitle": { ro: "Completează detaliile mai jos", en: "Fill in the details below" },
  "form.name": { ro: "Titlu", en: "Title" },
  "form.namePlaceholder": { ro: "ex: Meci de fotbal în parc", en: "e.g. Football in the park" },
  "form.description": { ro: "Descriere", en: "Description" },
  "form.descPlaceholder": { ro: "Spune mai multe despre activitate...", en: "Tell more about the activity..." },
  "form.category": { ro: "Categorie", en: "Category" },
  "form.customCategory": { ro: "Scrie categoria ta...", en: "Write your category..." },
  "form.location": { ro: "Locație", en: "Location" },
  "form.locationPlaceholder": { ro: "ex: Parcul Central", en: "e.g. Central Park" },
  "form.maxPeople": { ro: "Max persoane", en: "Max people" },
  "form.minAge": { ro: "Vârstă minimă", en: "Min age" },
  "form.maxAge": { ro: "Vârstă maximă", en: "Max age" },
  "form.date": { ro: "Data", en: "Date" },
  "form.time": { ro: "Ora", en: "Time" },
  "form.recurrence": { ro: "Se repetă", en: "Recurrence" },
  "form.recNone": { ro: "Nu se repetă", en: "No repeat" },
  "form.recWeekly": { ro: "Săptămânal", en: "Weekly" },
  "form.recBiweekly": { ro: "La 2 săptămâni", en: "Biweekly" },
  "form.recMonthly": { ro: "Lunar", en: "Monthly" },
  "form.publish": { ro: "Publică activitatea", en: "Publish activity" },
  "form.publishing": { ro: "Se publică...", en: "Publishing..." },

  // Detail
  "detail.title": { ro: "Detalii", en: "Details" },
  "detail.location": { ro: "Locație", en: "Location" },
  "detail.age": { ro: "Vârstă", en: "Age" },
  "detail.spots": { ro: "Locuri", en: "Spots" },
  "detail.organizer": { ro: "Organizator", en: "Organizer" },
  "detail.joinBtn": { ro: "Participă la activitate", en: "Join activity" },
  "detail.joinedMsg": { ro: "Participi la această activitate", en: "You joined this activity" },
  "detail.fullMsg": { ro: "Toate locurile sunt ocupate", en: "All spots are taken" },
  "detail.loginMsg": { ro: "Intră în cont pentru a participa.", en: "Login to participate." },
  "detail.participants": { ro: "Participanți", en: "Participants" },
  "detail.comments": { ro: "Comentarii", en: "Comments" },
  "detail.noComments": { ro: "Niciun comentariu încă. Fii primul care întreabă ceva!", en: "No comments yet. Be the first to ask!" },
  "detail.commentPlaceholder": { ro: "Scrie un comentariu...", en: "Write a comment..." },
  "detail.loginComment": { ro: "Intră în cont pentru a comenta.", en: "Login to comment." },
  "detail.free": { ro: "liber", en: "free" },
  "detail.freeP": { ro: "libere", en: "free" },
  "detail.delete": { ro: "Șterge", en: "Delete" },
  "detail.recurrence": { ro: "Se repetă", en: "Recurs" },
  "detail.chat": { ro: "Chat", en: "Chat" },
  "detail.review": { ro: "Dă review", en: "Review" },

  // Profile
  "profile.title": { ro: "Profilul meu", en: "My Profile" },
  "profile.activities": { ro: "Activități", en: "Activities" },
  "profile.participations": { ro: "Participări", en: "Joined" },
  "profile.settings": { ro: "Setări", en: "Settings" },
  "profile.created": { ro: "create", en: "created" },
  "profile.joined": { ro: "participări", en: "joined" },
  "profile.points": { ro: "Puncte\nreputație", en: "Reputation\npoints" },
  "profile.level": { ro: "Nivel", en: "Level" },
  "profile.badges": { ro: "Badge-uri", en: "Badges" },
  "profile.noBadges": { ro: "Participă la activități pentru a debloca badge-uri!", en: "Join activities to unlock badges!" },
  "profile.noCreated": { ro: "Nu ai propus nicio activitate", en: "You haven't proposed any activity" },
  "profile.noJoined": { ro: "Nu ai participat la nimic încă", en: "You haven't joined anything yet" },
  "profile.friends": { ro: "Prieteni", en: "Friends" },

  // Settings
  "settings.profilePic": { ro: "Poză de profil", en: "Profile picture" },
  "settings.picDesc": { ro: "JPG, PNG sau GIF. Max 2MB.", en: "JPG, PNG or GIF. Max 2MB." },
  "settings.changePic": { ro: "Schimbă poza", en: "Change photo" },
  "settings.uploadPic": { ro: "Încarcă poză", en: "Upload photo" },
  "settings.account": { ro: "Cont", en: "Account" },
  "settings.appearance": { ro: "Aspect", en: "Appearance" },
  "settings.darkMode": { ro: "Mod întunecat", en: "Dark mode" },
  "settings.darkOn": { ro: "Activat", en: "On" },
  "settings.darkOff": { ro: "Dezactivat", en: "Off" },
  "settings.language": { ro: "Limbă", en: "Language" },
  "settings.changePwd": { ro: "Schimbă parola", en: "Change password" },
  "settings.newPwd": { ro: "Parolă nouă", en: "New password" },
  "settings.confirmPwd": { ro: "Confirmă parola", en: "Confirm password" },
  "settings.changePwdBtn": { ro: "Schimbă parola", en: "Change password" },
  "settings.changingPwd": { ro: "Se schimbă...", en: "Changing..." },
  "settings.logout": { ro: "Ieși din cont", en: "Log out" },

  // Auth
  "auth.loginTitle": { ro: "Bine ai revenit!", en: "Welcome back!" },
  "auth.signupTitle": { ro: "Creează cont", en: "Create account" },
  "auth.loginSubtitle": { ro: "Intră în contul tău pentru a continua.", en: "Log in to your account to continue." },
  "auth.signupSubtitle": { ro: "Creează un cont pentru a propune și participa.", en: "Create an account to propose and participate." },
  "auth.username": { ro: "Username", en: "Username" },
  "auth.email": { ro: "Email", en: "Email" },
  "auth.password": { ro: "Parolă", en: "Password" },
  "auth.loginBtn": { ro: "Intră în cont", en: "Log in" },
  "auth.signupBtn": { ro: "Creează cont", en: "Create account" },
  "auth.noAccount": { ro: "Nu ai cont?", en: "No account?" },
  "auth.hasAccount": { ro: "Ai deja cont?", en: "Already have an account?" },
  "auth.createOne": { ro: "Creează unul", en: "Create one" },
  "auth.loginLink": { ro: "Intră în cont", en: "Log in" },
  "auth.loading": { ro: "Se încarcă...", en: "Loading..." },

  // Delete modal
  "delete.title": { ro: "Șterge activitatea?", en: "Delete activity?" },
  "delete.desc": { ro: "Această acțiune nu poate fi anulată. Toate comentariile și participările vor fi șterse.", en: "This action cannot be undone. All comments and participations will be deleted." },
  "delete.cancel": { ro: "Anulează", en: "Cancel" },
  "delete.confirm": { ro: "Șterge", en: "Delete" },

  // Footer
  "footer.text": { ro: "Făcut cu drag pentru o lume mai conectată.", en: "Made with love for a more connected world." },

  // Toasts
  "toast.joined": { ro: "Te-ai alăturat! +10 puncte", en: "You joined! +10 points" },
  "toast.left": { ro: "Ai părăsit activitatea. -10 puncte", en: "You left the activity. -10 points" },
  "toast.published": { ro: "Activitate publicată!", en: "Activity published!" },
  "toast.deleted": { ro: "Activitate ștearsă.", en: "Activity deleted." },
  "toast.welcome": { ro: "Bun venit!", en: "Welcome!" },
  "toast.linkCopied": { ro: "Link copiat!", en: "Link copied!" },
  "toast.pwdChanged": { ro: "Parola a fost schimbată!", en: "Password changed!" },
  "toast.picUpdated": { ro: "Poza de profil actualizată!", en: "Profile picture updated!" },
  "toast.reported": { ro: "a fost raportat. -15 puncte", en: "has been reported. -15 points" },
  "toast.alreadyReported": { ro: "Ai raportat deja acest participant.", en: "You already reported this participant." },
  "toast.commentDeleted": { ro: "Comentariu șters.", en: "Comment deleted." },

  // Feed
  "feed.title": { ro: "Activitate recentă", en: "Recent activity" },
  "feed.joined": { ro: "s-a alăturat la", en: "joined" },
  "feed.created": { ro: "a creat", en: "created" },
  "feed.empty": { ro: "Nicio activitate recentă", en: "No recent activity" },

  // Date
  "date.today": { ro: "Azi", en: "Today" },
  "date.tomorrow": { ro: "Mâine", en: "Tomorrow" },
  "date.inDays": { ro: "În {n} zile", en: "In {n} days" },
  "date.day": { ro: "Zi", en: "Day" },
  "date.month": { ro: "Luna", en: "Month" },
  "date.year": { ro: "An", en: "Year" },
  "date.hour": { ro: "Ora", en: "Hour" },
  "date.minute": { ro: "Min", en: "Min" },

  // Categories
  "cat.sport": { ro: "Sport", en: "Sports" },
  "cat.board-games": { ro: "Board Games", en: "Board Games" },
  "cat.outdoor": { ro: "În aer liber", en: "Outdoor" },
  "cat.music": { ro: "Muzică", en: "Music" },
  "cat.art": { ro: "Artă", en: "Art" },
  "cat.food": { ro: "Mâncare", en: "Food" },
  "cat.study": { ro: "Învățare", en: "Study" },
  "cat.other": { ro: "Altele", en: "Other" },

  // Filters
  "filter.advanced": { ro: "Filtre", en: "Filters" },
  "filter.dateFrom": { ro: "De la", en: "From" },
  "filter.dateTo": { ro: "Până la", en: "Until" },
  "filter.ageRange": { ro: "Vârstă", en: "Age" },
  "filter.clear": { ro: "Resetează", en: "Clear" },
  "filter.results": { ro: "activități", en: "activities" },
  "filter.result": { ro: "activitate", en: "activity" },

  // Review
  "review.title": { ro: "Dă review participanților", en: "Review participants" },
  "review.done": { ro: "Review trimis!", en: "Review sent!" },
  "review.alreadyDone": { ro: "Ai dat deja review.", en: "Already reviewed." },

  // Friends
  "friends.add": { ro: "Adaugă prieten", en: "Add friend" },
  "friends.pending": { ro: "În așteptare", en: "Pending" },
  "friends.accept": { ro: "Acceptă", en: "Accept" },
  "friends.reject": { ro: "Refuză", en: "Reject" },
  "friends.remove": { ro: "Elimină", en: "Remove" },
  "friends.none": { ro: "Niciun prieten încă", en: "No friends yet" },
  "friends.requests": { ro: "Cereri de prietenie", en: "Friend requests" },

  // Chat
  "chat.placeholder": { ro: "Scrie un mesaj...", en: "Write a message..." },
  "chat.login": { ro: "Intră în cont pentru a trimite mesaje.", en: "Login to send messages." },
  "chat.empty": { ro: "Niciun mesaj încă", en: "No messages yet" },

  // Extra
  "misc.anonymous": { ro: "Anonim", en: "Anonymous" },
  "misc.error": { ro: "Eroare", en: "Error" },
  "misc.onlyImages": { ro: "Doar imagini sunt permise.", en: "Only images are allowed." },
  "misc.maxSize": { ro: "Max 2MB.", en: "Max 2MB." },
  "misc.minChars": { ro: "Minim 6 caractere.", en: "Minimum 6 characters." },
  "misc.pwdNoMatch": { ro: "Parolele nu se potrivesc.", en: "Passwords don't match." },
  "misc.backHome": { ro: "Înapoi acasă", en: "Back home" },
  "misc.notFound": { ro: "Activitatea nu a fost găsită", en: "Activity not found" },
  "misc.notFoundDesc": { ro: "Poate a fost ștearsă sau link-ul e greșit.", en: "It may have been deleted or the link is wrong." },
  "misc.map": { ro: "Hartă", en: "Map" },
  "misc.mapEmpty": { ro: "Nicio activitate pe hartă", en: "No activities on the map" },
  "misc.mapEmptyDesc": { ro: "Activitățile cu coordonate GPS vor apărea aici.", en: "Activities with GPS coordinates will appear here." },
  "misc.copyLink": { ro: "Copiază link", en: "Copy link" },
  "misc.shareWA": { ro: "Trimite pe WhatsApp", en: "Share on WhatsApp" },
  "misc.deleteActivity": { ro: "Șterge activitatea", en: "Delete activity" },
  "misc.reportTitle": { ro: "Raportează — nu a venit", en: "Report — didn't show up" },
  "misc.details": { ro: "Detalii", en: "Details" },
  "misc.in": { ro: "în", en: "in" },
  "misc.for": { ro: "pentru", en: "for" },
  "misc.friendReqSent": { ro: "Cerere trimisă!", en: "Request sent!" },
  "misc.friendReqDup": { ro: "Cerere deja trimisă.", en: "Request already sent." },
  "misc.friendNotFound": { ro: "Utilizatorul nu există.", en: "User not found." },
  "misc.friendAccepted": { ro: "Prieten acceptat!", en: "Friend accepted!" },
  "misc.friendRemoved": { ro: "Prieten eliminat.", en: "Friend removed." },

  // Date months
  "date.months": { ro: "Ian,Feb,Mar,Apr,Mai,Iun,Iul,Aug,Sep,Oct,Nov,Dec", en: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec" },
} as const;

type TranslationKey = keyof typeof translations;

type I18nContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextType>({
  lang: "ro",
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ro");

  useEffect(() => {
    const saved = localStorage.getItem("hangout-lang") as Lang | null;
    if (saved) setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("hangout-lang", l);
  }

  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    let text: string = translations[key]?.[lang] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
