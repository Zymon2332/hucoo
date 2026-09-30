import {
  ArrowsClockwise,
  Copy,
  PencilSimple,
} from "@phosphor-icons/react";
import { Button } from "@hucoo/ui/components/button";

export function MessageActions({
  role,
  onCopy,
  onRegenerate,
  onEdit,
}: {
  role: "user" | "assistant";
  onCopy: () => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/message:opacity-100">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="复制"
        onClick={onCopy}
      >
        <Copy size={14} />
      </Button>
      {role === "assistant" && onRegenerate && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="重新生成"
          onClick={onRegenerate}
        >
          <ArrowsClockwise size={14} />
        </Button>
      )}
      {role === "user" && onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="编辑"
          onClick={onEdit}
        >
          <PencilSimple size={14} />
        </Button>
      )}
    </div>
  );
}
