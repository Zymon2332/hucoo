export function createRandom(seed: number) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(random: () => number, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function randomFloat(random: () => number, min: number, max: number, digits = 2) {
  const value = random() * (max - min) + min;
  return Number(value.toFixed(digits));
}

export function pickOne<T>(random: () => number, items: readonly T[]): T {
  const index = Math.floor(random() * items.length);
  return items[Math.min(index, items.length - 1)] as T;
}

export function pickMany<T>(random: () => number, items: readonly T[], count: number): T[] {
  const pool = [...items];
  const result: T[] = [];
  const size = Math.min(count, pool.length);
  for (let i = 0; i < size; i += 1) {
    const index = Math.floor(random() * pool.length);
    result.push(pool.splice(index, 1)[0] as T);
  }
  return result;
}

const BASE_TIME = new Date("2026-09-17T09:30:00+08:00").getTime();

export function daysAgo(days: number, hour = 10, minute = 0) {
  const date = new Date(BASE_TIME - days * 86_400_000);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export function daysFromNow(days: number) {
  return new Date(BASE_TIME + days * 86_400_000).toISOString();
}

export function hoursAgo(hours: number, minute = 15) {
  const date = new Date(BASE_TIME - hours * 3_600_000);
  date.setMinutes(minute, 0, 0);
  return date.toISOString();
}

export function minutesAgo(minutes: number) {
  return new Date(BASE_TIME - minutes * 60_000).toISOString();
}

export function buildSeries(days: number, seed: number) {
  const random = createRandom(seed);
  const points: { date: string; calls: number; tokens: number; cost: number; successRate: number; p95: number }[] =
    [];
  let calls = randomInt(random, 320_000, 420_000);
  let tokens = randomInt(random, 62_000_000, 78_000_000);

  for (let index = days - 1; index >= 0; index -= 1) {
    const weekday = new Date(BASE_TIME - index * 86_400_000).getDay();
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.62 : 1;
    calls = Math.round(calls * randomFloat(random, 0.97, 1.06) * weekendFactor);
    tokens = Math.round(tokens * randomFloat(random, 0.97, 1.05) * weekendFactor);
    const cost = Number(((tokens / 1000) * randomFloat(random, 0.012, 0.02)).toFixed(2));
    const successRate = randomFloat(random, 97.2, 99.7, 2);
    const p95 = randomInt(random, 820, 1680);
    points.push({
      date: new Date(BASE_TIME - index * 86_400_000).toISOString().slice(0, 10),
      calls,
      tokens,
      cost,
      successRate,
      p95,
    });
  }

  return points;
}

export function fingerprint(seed: number) {
  const random = createRandom(seed);
  const chars = "0123456789abcdef";
  let value = "";
  for (let i = 0; i < 8; i += 1) value += chars[Math.floor(random() * chars.length)];
  return `sk-…${value}`;
}
