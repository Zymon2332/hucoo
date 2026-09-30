import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { initTheme } from "@/lib/theme";
import { MotionProvider } from "@/features/settings/motion-provider";
import { useThreadsStore } from "@/features/threads/threads-store";
import { useArtifactsStore } from "@/features/artifact/artifact-store";
import "./styles.css";

initTheme();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

async function enableMocking() {
  if (!import.meta.env.DEV) return;
  const { worker } = await import("@/mocks/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root not found");

enableMocking().then(() => {
  void useThreadsStore.getState().hydrate();
  void useArtifactsStore.getState().hydrate();
  createRoot(rootElement).render(
    <StrictMode>
      <MotionProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </MotionProvider>
    </StrictMode>,
  );
});
