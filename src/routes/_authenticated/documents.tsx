import { createFileRoute } from "@tanstack/react-router";
import { DocumentManager } from "@/components/document-manager";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — ProjectCore" }] }),
  component: () => <div className="p-8"><DocumentManager /></div>,
});
