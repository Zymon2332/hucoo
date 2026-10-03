import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const numberFormatter = new Intl.NumberFormat("zh-CN");

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("zh-CN", options).format(value);
}

export function formatCompact(value: number) {
  if (Math.abs(value) >= 100_000_000) return `${(value / 100_000_000).toFixed(2)} 亿`;
  if (Math.abs(value) >= 10_000) return `${(value / 10_000).toFixed(1)} 万`;
  if (Math.abs(value) >= 1_000) return numberFormatter.format(value);
  return String(value);
}

export function formatCurrency(value: number, currency = "CNY", fractionDigits = 2) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatCompactCurrency(value: number, _currency = "CNY") {
  if (Math.abs(value) >= 1_000_000) return `¥${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `¥${(value / 1_000).toFixed(1)}K`;
  return `¥${value.toFixed(2)}`;
}

export function formatPercent(value: number, fractionDigits = 1) {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatDelta(value: number, fractionDigits = 1) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(fractionDigits)}%`;
}

export function formatDate(input: string | number | Date, pattern = "yyyy-MM-dd") {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "--";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");

  switch (pattern) {
    case "yyyy-MM-dd":
      return `${year}-${month}-${day}`;
    case "yyyy-MM-dd HH:mm":
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    case "yyyy-MM-dd HH:mm:ss":
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case "MM-dd HH:mm":
      return `${month}-${day} ${hours}:${minutes}`;
    case "MM-dd HH:mm:ss":
      return `${month}-${day} ${hours}:${minutes}:${seconds}`;
    case "MM-dd":
      return `${month}-${day}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

export function formatRelativeTime(input: string | number | Date) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "--";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} 天前`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.round(months / 12)} 年前`;
}

export function truncate(value: string, length = 32) {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

export function initialsOf(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  if (/^[\u4e00-\u9fa5]/.test(trimmed)) return trimmed.slice(-2);
  const parts = trimmed.split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

export function sum(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
