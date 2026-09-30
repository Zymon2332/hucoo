export interface SendPayload {
  text: string;
  tools: string[];
  mentions: string[];
  attachments: string[];
}

export function parseComposerText(text: string): {
  tools: string[];
  mentions: string[];
} {
  const tools = new Set<string>();
  const mentions = new Set<string>();
  const re = /(^|\s)([/@])([\w\u4e00-\u9fa5-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const value = match[3]!;
    if (match[2] === "/") tools.add(value);
    else mentions.add(value);
  }
  return { tools: [...tools], mentions: [...mentions] };
}
