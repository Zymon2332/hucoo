export interface Command {
  id: string;
  title: string;
  group: string;
  keywords?: string[];
  shortcut?: string;
  run: () => void;
}

function matchScore(text: string, query: string): number {
  const t = text.toLowerCase();
  if (t === query) return 100;
  if (t.startsWith(query)) return 80;
  if (t.includes(query)) return 60;

  let i = 0;
  for (const ch of t) {
    if (ch === query[i]) i += 1;
    if (i === query.length) return 30;
  }
  return 0;
}

function score(command: Command, query: string): number {
  const fields = [command.title, command.group, ...(command.keywords ?? [])];
  return Math.max(...fields.map((field) => matchScore(field, query)));
}

export function searchCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;

  return commands
    .map((command, index) => ({ command, index, score: score(command, q) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.command);
}
