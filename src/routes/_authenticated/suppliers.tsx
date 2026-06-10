import { createFileRoute } from "@tanstack/react-router";
import { SupplierRegister } from "@/components/supplier-register";

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — ProjectCore" }] }),
  component: () => <SupplierRegister />,
});
