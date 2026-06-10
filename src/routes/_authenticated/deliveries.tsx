import { createFileRoute } from "@tanstack/react-router";
import { DeliveryRegister } from "@/components/delivery-register";

export const Route = createFileRoute("/_authenticated/deliveries")({
  head: () => ({ meta: [{ title: "Deliveries — ProjectCore" }] }),
  component: () => <DeliveryRegister />,
});
