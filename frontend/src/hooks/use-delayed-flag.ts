"use client";

import * as React from "react";

/**
 * 延迟把 loading 状态暴露给 UI。
 * 近实时的请求不会闪出骨架屏，只有超过 delay 的等待才显示占位。
 */
export function useDelayedFlag(active: boolean, delay = 150): boolean {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [active, delay]);

  return visible;
}
