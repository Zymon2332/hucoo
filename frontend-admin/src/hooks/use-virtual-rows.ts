"use client";

import * as React from "react";

/**
 * 朴素的窗口化虚拟滚动：固定行高的列表只渲染可视区 + overscan 的行。
 * 组织树与成员列表共用同一实现，避免为一个列表引入额外依赖。
 */
export interface UseVirtualRowsOptions {
  count: number;
  rowHeight: number;
  /** 可视区上下各多渲染几行，减少快速滚动时的白屏 */
  overscan?: number;
}

export interface UseVirtualRowsResult {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  totalHeight: number;
  offsetY: number;
  startIndex: number;
  endIndex: number;
  viewportHeight: number;
  scrollToIndex: (index: number, align?: "auto" | "start" | "center") => void;
}

export function useVirtualRows({
  count,
  rowHeight,
  overscan = 8,
}: UseVirtualRowsOptions): UseVirtualRowsResult {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const frameRef = React.useRef(0);
  const pendingRef = React.useRef(0);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(0);

  React.useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setViewportHeight(entry.contentRect.height);
    });
    observer.observe(element);
    setViewportHeight(element.clientHeight);
    return () => observer.disconnect();
  }, []);

  React.useEffect(
    () => () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  // 行数变少时把滚动位置拉回有效范围，避免出现空白区
  React.useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const max = Math.max(0, count * rowHeight - element.clientHeight);
    if (element.scrollTop > max) {
      element.scrollTop = max;
      setScrollTop(max);
    }
  }, [count, rowHeight]);

  const onScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    pendingRef.current = event.currentTarget.scrollTop;
    if (frameRef.current) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = 0;
      setScrollTop(pendingRef.current);
    });
  }, []);

  const totalHeight = count * rowHeight;
  const visibleCount = viewportHeight > 0 ? Math.ceil(viewportHeight / rowHeight) : 0;
  // 过滤后行数骤减时，旧滚动位置可能已经越界：这里把起始行夹回 [0, count-1]，
  // 保证只要 count > 0 就至少渲染一行，不出现「有数据却空白」。
  const startIndex = Math.min(
    Math.max(0, count - 1),
    Math.max(0, Math.floor(scrollTop / rowHeight) - overscan),
  );
  const endIndex = Math.min(count, startIndex + visibleCount + overscan * 2);

  const scrollToIndex = React.useCallback<UseVirtualRowsResult["scrollToIndex"]>(
    (index, align = "auto") => {
      const element = scrollRef.current;
      if (!element || index < 0) return;

      // 容器有内边距，内容坐标要加上 paddingTop 才能换算成 scrollTop，
      // 否则最后一行会被 padding 顶掉、看起来「没滚到」。
      const paddingTop = Number.parseFloat(getComputedStyle(element).paddingTop) || 0;
      const top = paddingTop + index * rowHeight;
      const bottom = top + rowHeight;
      const viewTop = element.scrollTop;
      const viewBottom = viewTop + element.clientHeight;
      const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);

      let next = viewTop;
      if (align === "start") {
        next = top;
      } else if (align === "center") {
        next = top - (element.clientHeight - rowHeight) / 2;
      } else if (top < viewTop) {
        next = top;
      } else if (bottom > viewBottom) {
        next = bottom - element.clientHeight;
      } else {
        return;
      }

      const clamped = Math.max(0, Math.min(maxScroll, next));
      if (clamped === viewTop) return;
      element.scrollTop = clamped;
      setScrollTop(clamped);
    },
    [rowHeight],
  );

  return {
    scrollRef,
    onScroll,
    totalHeight,
    offsetY: startIndex * rowHeight,
    startIndex,
    endIndex,
    viewportHeight,
    scrollToIndex,
  };
}
