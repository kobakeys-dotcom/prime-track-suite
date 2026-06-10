import { createFileRoute } from "@tanstack/react-router";
import { PaymentClaimRegister } from "@/components/payment-claim-register";

export const Route = createFileRoute("/_authenticated/payment-claims")({
  head: () => ({ meta: [{ title: "Payment Claims / IPC — ProjectCore" }] }),
  component: () => <div className="p-4 md:p-6"><PaymentClaimRegister /></div>,
});
