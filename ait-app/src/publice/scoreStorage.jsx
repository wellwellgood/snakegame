const KEY = "snake_scores";

export const loadScores = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
export const saveScores = (arr) =>
  localStorage.setItem(KEY, JSON.stringify(arr));
export const clearScores = () => saveScores([]);
export const addScore = (rec) => {
  const arr = loadScores();
  arr.push(rec);
  arr.sort((a, b) => b.score - a.score || a.durationMs - b.durationMs);
  const top = arr.slice(0, 50);
  saveScores(top);
  return top;
};
