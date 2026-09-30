export function CodeRenderer({ content }: { content: string }) {
  return (
    <pre className="overflow-auto rounded-[10px] border border-border bg-secondary p-3 text-xs leading-relaxed">
      <code>{content}</code>
    </pre>
  );
}
