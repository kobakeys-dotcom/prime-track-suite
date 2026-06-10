import { createFileRoute } from "@tanstack/react-router";
import { MeetingActionItems } from "@/components/meeting-action-items";

export const Route = createFileRoute("/_authenticated/action-items")({
  head: () => ({ meta: [{ title: "Action Items — ProjectCore" }] }),
  component: ActionItemsPage,
});

function ActionItemsPage() {
  return <MeetingActionItems variant="full" />;
}
