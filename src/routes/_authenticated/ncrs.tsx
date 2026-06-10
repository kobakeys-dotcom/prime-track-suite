import { createFileRoute } from "@tanstack/react-router";
import { NcrRegister } from "@/components/ncr-register";

export const Route = createFileRoute("/_authenticated/ncrs")({
  head: () => ({ meta: [{ title: "NCRs — ProjectCore" }] }),
  component: () => (
    <div className="p-8">
      <NcrRegister />
    </div>
  ),
});
