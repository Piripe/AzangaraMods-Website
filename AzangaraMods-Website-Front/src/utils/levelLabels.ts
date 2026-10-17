export const difficultyNames: Record<LevelDifficulties, string> = {
  10: "Very Easy",
  20: "Easy",
  30: "Normal",
  40: "Hard",
  50: "Very Hard",
  60: "Expert"
};

// Same order as the report form
export const reportCategories: { id: ReportCategories, label: string, description: string }[] = [
  { id: 10, label: "Not an Azangara level", description: "The file isn't a level for Azangara." },
  { id: 20, label: "Not working", description: "The level doesn't load, crashes or can't be finished." },
  { id: 30, label: "Spam", description: "Advertising, junk or a duplicate upload." },
  { id: 40, label: "Other", description: "Tell us what's wrong." },
];

export const reportCategoryNames = Object.fromEntries(reportCategories.map(c=>[c.id, c.label])) as Record<ReportCategories, string>;

export function getLevelSizeText(size: number) {
  if (size < 8) return "Very Small";
  if (size < 16) return "Small";
  if (size < 24) return "Medium";
  if (size < 32) return "Large";
  return "Very Large";
}

// Room count buckets of getLevelSizeText; ids are the backend LevelSizes names, sent as ?size=
export const levelSizes = [
  { id: "verySmall", label: "Very Small", rooms: "1–7" },
  { id: "small", label: "Small", rooms: "8–15" },
  { id: "medium", label: "Medium", rooms: "16–23" },
  { id: "large", label: "Large", rooms: "24–31" },
  { id: "veryLarge", label: "Very Large", rooms: "32+" },
];

export function galleryImageUrl(levelId: string, fileId: string) {
  return process.env.NEXT_PUBLIC_API_URL + "/download/level/" + levelId + "/gallery/" + fileId;
}

// version busts the browser cache after the picture changes
export function avatarUrl(userId: string, version?: number) {
  return process.env.NEXT_PUBLIC_API_URL + "/download/user/" + userId + "/avatar" + (version ? "?v=" + version : "");
}

export function levelFileDownloadUrl(levelId: string, fileId: string, ext: "pak"|"zip" = "pak") {
  return process.env.NEXT_PUBLIC_API_URL + "/download/level/" + levelId + "/files/" + fileId + "?ext=" + ext;
}

export function getRoomsText(roomAmount: number) {
  if (roomAmount <= 0) return "No rooms";
  return `${roomAmount} room${roomAmount == 1 ? "" : "s"} · ${getLevelSizeText(roomAmount)}`;
}

const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function formatCount(value: number) {
  return compactNumber.format(value);
}

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const relativeUnits: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function formatRelativeDate(date: string) {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  for (const [unit, size] of relativeUnits) {
    if (Math.abs(seconds) >= size) return relativeTime.format(Math.round(seconds / size), unit);
  }
  return "just now";
}
