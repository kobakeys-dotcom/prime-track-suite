import { createFileRoute } from "@tanstack/react-router";
import { PurchaseOrderRegister } from "@/components/purchase-order-register";

export const Route = createFileRoute("/_authenticated/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders — ProjectCore" }] }),
  component: () => (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Purchase Orders</h1>
        <p className="text-sm text-zinc-500">Create, approve, issue, and track purchase orders for materials, equipment, and services.</p>
      </div>
      <PurchaseOrderRegister />
    </div>
  ),
});
