import { createFileRoute } from "@tanstack/react-router";
import { MaterialRequestRegister } from "@/components/material-request-register";

export const Route = createFileRoute("/_authenticated/procurement")({
  head: () => ({ meta: [{ title: "Material Requests — ProjectCore" }] }),
  component: () => <div className="p-8"><MaterialRequestRegister /></div>,
});
