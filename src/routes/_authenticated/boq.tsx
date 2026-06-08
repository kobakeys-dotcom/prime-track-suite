import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
export const Route = createFileRoute("/_authenticated/boq")({
  head: () => ({ meta: [{ title: "BOQ Progress — ProjectCore" }] }),
  component: () => <ModuleStub title="BOQ Progress" description="Track bill-of-quantity items with planned vs. actual completion." />,
});
