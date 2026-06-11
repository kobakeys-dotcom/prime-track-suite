import { createFileRoute } from "@tanstack/react-router";
import { DrawingRegister } from "@/components/drawing-register";

export const Route = createFileRoute("/_authenticated/drawings")({
  head: () => ({ meta: [{ title: "Drawing Register — ProjectCore" }] }),
  component: () => <div className="p-8"><DrawingRegister /></div>,
});
