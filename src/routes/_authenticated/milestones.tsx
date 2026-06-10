import { createFileRoute } from "@tanstack/react-router";
import { RegisterPage } from "@/components/register-page";
import { REGISTERS } from "@/lib/register-configs";

const cfg = REGISTERS["milestones"];

export const Route = createFileRoute("/_authenticated/milestones")({
  head: () => ({ meta: [{ title: `${cfg.title} — ProjectCore` }] }),
  component: () => (
    <RegisterPage
      table="milestones"
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
