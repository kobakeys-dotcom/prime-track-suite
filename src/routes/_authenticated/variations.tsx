import { createFileRoute } from "@tanstack/react-router";
import { VariationRegister } from "@/components/variation-register";

export const Route = createFileRoute("/_authenticated/variations")({
  head: () => ({ meta: [{ title: "Variations — ProjectCore" }] }),
  component: () => <div className="p-4 md:p-6"><VariationRegister /></div>,
});
