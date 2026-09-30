import { useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "@phosphor-icons/react";
import { useHighlighter } from "@/lib/highlighter";

interface Highlighter {
  codeToHtml: (
    code: string,
    options: { lang: string; themes: { light: string; dark: string } },
  ) => string;
}

function CodeBlock({
  code,
  lang,
  highlighter,
}: {
  code: string;
  lang: string;
  highlighter: Highlighter | null;
}) {
  const [copied, setCopied] = useState(false);

  const html = useMemo(() => {
    if (!highlighter) return null;
    try {
      return highlighter.codeToHtml(code, {
        lang,
        themes: { light: "github-light", dark: "github-dark" },
      });
    } catch {
      return null;
    }
  }, [code, lang, highlighter]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <div className="my-3 overflow-hidden rounded-[10px] border border-border">
      <div className="flex items-center justify-between bg-secondary px-3 py-1">
        <span className="text-[11px] text-muted-foreground">{lang}</span>
        <button
          type="button"
          onClick={copy}
          aria-label="复制代码"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      {html ? (
        <div
          className="shiki-block overflow-auto p-3 text-xs leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-auto bg-secondary p-3 text-xs leading-relaxed">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  const highlighter = useHighlighter();

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-pre:bg-transparent prose-pre:p-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
          code: (props) => {
            const { className, children } = props as {
              className?: string;
              children?: ReactNode;
            };
            const match = /language-(\w+)/.exec(className ?? "");
            const code = String(children ?? "").replace(/\n$/, "");
            if (match) {
              return (
                <CodeBlock
                  code={code}
                  lang={match[1] ?? "text"}
                  highlighter={highlighter}
                />
              );
            }
            return (
              <code className="rounded bg-secondary px-1.5 py-0.5 text-[0.85em]">
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
