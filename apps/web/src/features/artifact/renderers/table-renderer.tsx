function parseRows(content: string): string[][] {
  const lines = content.trim().split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];
  const delimiter = lines[0]?.includes("\t") ? "\t" : ",";
  return lines.map((line) => line.split(delimiter).map((c) => c.trim()));
}

export function TableRenderer({ content }: { content: string }) {
  const rows = parseRows(content);
  const [header, ...body] = rows;

  if (!header) {
    return <p className="text-sm text-muted-foreground">空表格</p>;
  }

  return (
    <div className="overflow-auto rounded-[10px] border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary">
          <tr>
            {header.map((cell, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-section-label"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r} className="border-t border-border">
              {row.map((cell, c) => (
                <td key={c} className="px-3 py-2 tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
