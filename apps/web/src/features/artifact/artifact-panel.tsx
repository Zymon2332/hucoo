import type { Artifact } from "./artifact-types";
import { MarkdownRenderer } from "./renderers/markdown-renderer";
import { CodeRenderer } from "./renderers/code-renderer";
import { TableRenderer } from "./renderers/table-renderer";
import { HtmlRenderer } from "./renderers/html-renderer";

export function ArtifactBody({ artifact }: { artifact: Artifact }) {
  switch (artifact.kind) {
    case "markdown":
      return <MarkdownRenderer content={artifact.content} />;
    case "code":
      return <CodeRenderer content={artifact.content} />;
    case "table":
      return <TableRenderer content={artifact.content} />;
    case "html":
      return <HtmlRenderer content={artifact.content} />;
  }
}
