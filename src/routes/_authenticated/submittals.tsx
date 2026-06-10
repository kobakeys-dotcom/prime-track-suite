import { createFileRoute } from "@tanstack/react-router";
import { SubmittalRegister } from "@/components/submittal-register";

export const Route = createFileRoute("/_authenticated/submittals")({
  head: () => ({ meta: [{ title: "Submittals — ProjectCore" }] }),
  component: () => <div className="p-4 md:p-6"><SubmittalRegister /></div>,
});
