export const difficultyNames: Record<LevelDifficulties, string> = {
  10: "Very Easy",
  20: "Easy",
  30: "Normal",
  40: "Hard",
  50: "Very Hard",
  60: "Expert"
};

export function getLevelSizeText(size: number) {
  if (size < 8) return "Very Small";
  if (size < 16) return "Small";
  if (size < 24) return "Medium";
  if (size < 32) return "Large";
  return "Very Large";
}

export function galleryImageUrl(levelId: string, fileId: string) {
  return process.env.NEXT_PUBLIC_API_URL + "/download/level/" + levelId + "/gallery/" + fileId;
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
