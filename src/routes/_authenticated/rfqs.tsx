import { createFileRoute } from "@tanstack/react-router";
import { RfqRegister } from "@/components/rfq-register";

export const Route = createFileRoute("/_authenticated/rfqs")({
  head: () => ({ meta: [{ title: "RFQs — ProjectCore" }] }),
  component: () => (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Requests for Quotation</h1>
        <p className="text-sm text-zinc-500">Create RFQs, invite suppliers, compare quotations, and award contracts.</p>
      </div>
      <RfqRegister />
    </div>
  ),
});
