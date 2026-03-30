export type Badge = {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  descriptionEn: string;
  requirement: (stats: UserStats) => boolean;
};

export type UserStats = {
  points: number;
  activitiesCreated: number;
  activitiesJoined: number;
  avgStars: number;
};

export const BADGES: Badge[] = [
  {
    id: "first-step",
    name: "Primul pas",
    nameEn: "First Step",
    icon: "👣",
    description: "Ai participat la prima activitate",
    descriptionEn: "Joined your first activity",
    requirement: (s) => s.activitiesJoined >= 1,
  },
  {
    id: "social-butterfly",
    name: "Fluture social",
    nameEn: "Social Butterfly",
    icon: "🦋",
    description: "Ai participat la 5 activități",
    descriptionEn: "Joined 5 activities",
    requirement: (s) => s.activitiesJoined >= 5,
  },
  {
    id: "party-animal",
    name: "Sufletul petrecerii",
    nameEn: "Party Animal",
    icon: "🎉",
    description: "Ai participat la 15 activități",
    descriptionEn: "Joined 15 activities",
    requirement: (s) => s.activitiesJoined >= 15,
  },
  {
    id: "creator",
    name: "Creator",
    nameEn: "Creator",
    icon: "✨",
    description: "Ai creat prima activitate",
    descriptionEn: "Created your first activity",
    requirement: (s) => s.activitiesCreated >= 1,
  },
  {
    id: "organizer",
    name: "Organizator",
    nameEn: "Organizer",
    icon: "📋",
    description: "Ai creat 5 activități",
    descriptionEn: "Created 5 activities",
    requirement: (s) => s.activitiesCreated >= 5,
  },
  {
    id: "legend",
    name: "Legendă",
    nameEn: "Legend",
    icon: "👑",
    description: "Ai acumulat 100 de puncte",
    descriptionEn: "Accumulated 100 points",
    requirement: (s) => s.points >= 100,
  },
  {
    id: "rising-star",
    name: "Stea în ascensiune",
    nameEn: "Rising Star",
    icon: "⭐",
    description: "Ai acumulat 50 de puncte",
    descriptionEn: "Accumulated 50 points",
    requirement: (s) => s.points >= 50,
  },
  {
    id: "trusted",
    name: "De încredere",
    nameEn: "Trusted",
    icon: "🛡️",
    description: "Rating mediu de 4+ stele",
    descriptionEn: "Average rating of 4+ stars",
    requirement: (s) => s.avgStars >= 4 && s.activitiesJoined >= 3,
  },
];

export function getLevel(points: number): { level: number; name: string; nameEn: string; progress: number; nextAt: number } {
  const levels = [
    { at: 0, name: "Începător", nameEn: "Beginner" },
    { at: 30, name: "Explorator", nameEn: "Explorer" },
    { at: 80, name: "Sociabil", nameEn: "Sociable" },
    { at: 150, name: "Veteran", nameEn: "Veteran" },
    { at: 300, name: "Legendă", nameEn: "Legend" },
    { at: 500, name: "Maestru", nameEn: "Master" },
  ];

  let current = levels[0];
  let next = levels[1];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (points >= levels[i].at) {
      current = levels[i];
      next = levels[i + 1] ?? levels[i];
      break;
    }
  }

  const progress = next.at === current.at ? 100 : Math.min(((points - current.at) / (next.at - current.at)) * 100, 100);

  return {
    level: levels.indexOf(current) + 1,
    name: current.name,
    nameEn: current.nameEn,
    progress,
    nextAt: next.at,
  };
}

export function getUnlockedBadges(stats: UserStats): Badge[] {
  return BADGES.filter((b) => b.requirement(stats));
}
