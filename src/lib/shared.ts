export type Activity = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string;
  date: string;
  max_people: number;
  min_age: number;
  max_age: number;
  created_by: string;
  created_at: string;
  user_id: string | null;
  recurrence: string | null;
  lat: number | null;
  lng: number | null;
};

export type Comment = {
  id: string;
  activity_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
};

export const CATEGORIES = [
  { value: "sport", label: "Sport", icon: "⚽" },
  { value: "board-games", label: "Board Games", icon: "🎲" },
  { value: "outdoor", label: "În aer liber", icon: "🌳" },
  { value: "music", label: "Muzică", icon: "🎵" },
  { value: "art", label: "Artă", icon: "🎨" },
  { value: "food", label: "Mâncare", icon: "🍕" },
  { value: "study", label: "Învățare", icon: "📚" },
  { value: "other", label: "Altele", icon: "✨" },
];

export function getCategoryInfo(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[7];
}

export function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Azi";
  if (days === 1) return "Mâine";
  if (days < 7) return `În ${days} zile`;

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "acum";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}z`;
}
