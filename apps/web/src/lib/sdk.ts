import { createSdk } from "@hucoo/sdk";
import { useAuthStore } from "@/features/auth/auth-store";

const baseUrl =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  "http://localhost:8080";

export const sdk = createSdk({
  baseUrl,
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => useAuthStore.getState().clear(),
});
