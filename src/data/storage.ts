const KEY = "depence:v1:save";

export interface SaveData {
  bestWave: number;
  victories: number;
  attempts: number;
}

const empty = (): SaveData => ({ bestWave: 0, victories: 0, attempts: 0 });

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      bestWave: parsed.bestWave ?? 0,
      victories: parsed.victories ?? 0,
      attempts: parsed.attempts ?? 0,
    };
  } catch {
    return empty();
  }
}

export function recordResult(
  waveReached: number,
  won: boolean,
): { save: SaveData; isNewBest: boolean } {
  const save = loadSave();
  save.attempts++;
  if (won) save.victories++;
  const isNewBest = waveReached > save.bestWave;
  if (isNewBest) save.bestWave = waveReached;
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // localStorage may be unavailable; ignore
  }
  return { save, isNewBest };
}
