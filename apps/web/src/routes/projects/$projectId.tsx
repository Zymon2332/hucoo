import { createFileRoute } from "@tanstack/react-router";
import { ProjectView } from "@/features/projects/project-view";

export const Route = createFileRoute("/projects/$projectId")({
  component: Project,
});

function Project() {
  const { projectId } = Route.useParams();
  return <ProjectView projectId={projectId} />;
}
