import { create } from "zustand";

export interface Prefs {
  reduceMotion: boolean;
}

const STORAGE_KEY = "hucoo-prefs";

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { reduceMotion: false, ...(JSON.parse(raw) as Partial<Prefs>) };
    }
  } catch {
    // ignore
  }
  return { reduceMotion: false };
}

interface PrefsStore extends Prefs {
  setReduceMotion: (value: boolean) => void;
}

export const usePrefsStore = create<PrefsStore>((set) => ({
  ...loadPrefs(),
  setReduceMotion: (value) => {
    const next = { reduceMotion: value };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set(next);
  },
}));
