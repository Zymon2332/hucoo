import { createFileRoute } from "@tanstack/react-router";
import { CanvasView } from "@/features/canvas/canvas-view";

export const Route = createFileRoute("/canvas")({ component: CanvasView });
