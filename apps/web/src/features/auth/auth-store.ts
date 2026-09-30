import { create } from "zustand";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

const STORAGE_KEY = "hucoo-auth";

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

interface AuthStore {
  token?: string;
  user?: AuthUser;
  setSession: (session: AuthSession) => void;
  clear: () => void;
}

const initial = loadSession();

export const useAuthStore = create<AuthStore>((set) => ({
  token: initial?.token,
  user: initial?.user,
  setSession: (session) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    set({ token: session.token, user: session.user });
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: undefined, user: undefined });
  },
}));
