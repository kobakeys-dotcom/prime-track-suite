import { createFileRoute } from "@tanstack/react-router";
import { RfiRegister } from "@/components/rfi-register";

export const Route = createFileRoute("/_authenticated/rfis")({
  head: () => ({ meta: [{ title: "RFIs — ProjectCore" }] }),
  component: () => <div className="p-4 md:p-6"><RfiRegister /></div>,
});
