import type { ReactNode } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hucoo/ui/components/resizable";

export function ResizableSplit({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
      <ResizablePanel minSize="40" className="min-h-0">
        <div className="flex h-full min-h-0 flex-col">{left}</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        defaultSize="35"
        minSize="22"
        maxSize="55"
        className="min-h-0"
      >
        <div className="h-full min-h-0">{right}</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
