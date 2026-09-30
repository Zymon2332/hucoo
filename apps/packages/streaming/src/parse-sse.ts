export interface RawSseEvent {
  event: string;
  data: string;
  id?: string;
}

function parseBlock(block: string): RawSseEvent | null {
  const lines = block.split("\n");
  let event = "message";
  let id: string | undefined;
  const data: string[] = [];

  for (const line of lines) {
    if (line === "" || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") event = value;
    else if (field === "data") data.push(value);
    else if (field === "id") id = value;
  }

  if (data.length === 0 && event === "message") return null;
  return { event, data: data.join("\n"), id };
}

export class SseParser {
  private buffer = "";

  push(chunk: string): RawSseEvent[] {
    this.buffer += chunk.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const out: RawSseEvent[] = [];
    let idx: number;
    while ((idx = this.buffer.indexOf("\n\n")) !== -1) {
      const block = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 2);
      const parsed = parseBlock(block);
      if (parsed) out.push(parsed);
    }
    return out;
  }

  flush(): RawSseEvent[] {
    const block = this.buffer;
    this.buffer = "";
    if (block.trim() === "") return [];
    const parsed = parseBlock(block);
    return parsed ? [parsed] : [];
  }
}
