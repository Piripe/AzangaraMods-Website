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
