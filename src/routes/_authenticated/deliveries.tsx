import { createFileRoute } from "@tanstack/react-router";
import { RegisterPage } from "@/components/register-page";
import { REGISTERS } from "@/lib/register-configs";

const cfg = REGISTERS["deliveries"];

export const Route = createFileRoute("/_authenticated/deliveries")({
  head: () => ({ meta: [{ title: `${cfg.title} — ProjectCore` }] }),
  component: () => (
    <RegisterPage
      table="deliveries"
      title={cfg.title}
      description={cfg.description}
      fields={cfg.fields}
      projectScoped={cfg.projectScoped}
      statusField={cfg.statusField}
      statusStyles={STATUS_STYLES_GENERIC}
    />
  ),
});

import { STATUS_STYLES_GENERIC } from "@/lib/register-configs";
