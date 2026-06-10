import { createFileRoute } from "@tanstack/react-router";
import { RegisterPage } from "@/components/register-page";
import { REGISTERS, STATUS_STYLES_GENERIC } from "@/lib/register-configs";

const cfg = REGISTERS["wbs_items"];

export const Route = createFileRoute("/_authenticated/wbs")({
  head: () => ({ meta: [{ title: `${cfg.title} — ProjectCore` }] }),
  component: () => (
    <RegisterPage
      table="wbs_items"
      title={cfg.title}
      description={cfg.description}
      fields={cfg.fields}
      projectScoped={cfg.projectScoped}
      statusField={cfg.statusField}
      statusStyles={STATUS_STYLES_GENERIC}
    />
  ),
});
