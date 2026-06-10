import { createFileRoute } from "@tanstack/react-router";
import { CashFlowModule } from "@/components/cash-flow-module";

export const Route = createFileRoute("/_authenticated/cash-flow")({
  head: () => ({ meta: [{ title: "Cash Flow — ProjectCore" }] }),
  component: () => <div className="p-4 md:p-6"><CashFlowModule /></div>,
});
