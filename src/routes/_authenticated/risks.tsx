import { createFileRoute } from "@tanstack/react-router";
import { RiskRegister } from "@/components/risk-register";

export const Route = createFileRoute("/_authenticated/risks")({
  head: () => ({ meta: [{ title: "Risk Register — ProjectCore" }] }),
  component: () => (
    <div className="p-6">
      <RiskRegister />
    </div>
  ),
});
