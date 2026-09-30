export function HtmlRenderer({ content }: { content: string }) {
  return (
    <iframe
      title="artifact-preview"
      sandbox=""
      srcDoc={content}
      className="h-full min-h-[320px] w-full rounded-[10px] border border-border bg-white"
    />
  );
}
