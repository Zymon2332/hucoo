import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { usePrefsStore } from "./prefs-store";

export function MotionProvider({ children }: { children: ReactNode }) {
  const reduceMotion = usePrefsStore((s) => s.reduceMotion);
  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      {children}
    </MotionConfig>
  );
}
