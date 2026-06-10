import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const buildReportData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    projectId: z.string().uuid().optional(),
    sections: z.array(z.string()).min(1),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const filt = (q: any) => data.projectId ? q.eq("project_id", data.projectId) : q;

    const out: any = { generated_at: new Date().toISOString(), sections: {} };

    if (data.sections.includes("weekly")) {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [{ data: tasksDone }, { data: rfis }, { data: risks }] = await Promise.all([
        filt(sb.from("tasks").select("id, title, status, updated_at").gte("updated_at", since).eq("status", "done")),
        filt(sb.from("rfis").select("id, subject, status").in("status", ["submitted","under_review"])),
        filt(sb.from("risks").select("id, title, severity").in("status", ["open","mitigating"])),
      ]);
      out.sections.weekly = { tasksDone: tasksDone ?? [], openRfis: rfis ?? [], openRisks: risks ?? [] };
    }

    if (data.sections.includes("monthly") || data.sections.includes("cost")) {
      const [{ data: boq }, { data: vars }, { data: claims }] = await Promise.all([
        filt(sb.from("boq_items").select("quantity, completed_qty, unit_rate")),
        filt(sb.from("variations").select("cost_impact, approved_amount, status")),
        filt(sb.from("payment_claims").select("net_claim, status, period_end")),
      ]);
      const budget = (boq ?? []).reduce((s: number, r: any) => s + Number(r.quantity ?? 0) * Number(r.unit_rate ?? 0), 0);
      const actual = (boq ?? []).reduce((s: number, r: any) => s + Number(r.completed_qty ?? 0) * Number(r.unit_rate ?? 0), 0);
      const approvedVars = (vars ?? []).filter((v: any) => v.status === "approved").reduce((s: number, v: any) => s + Number(v.approved_amount ?? v.cost_impact ?? 0), 0);
      const certified = (claims ?? []).filter((c: any) => ["approved","paid"].includes(c.status)).reduce((s: number, c: any) => s + Number(c.net_claim ?? 0), 0);
      out.sections.cost = { budget, actual, approvedVars, certified, claims: claims ?? [] };
    }

    if (data.sections.includes("qhse")) {
      const [{ data: insp }, { data: ncrs }, { data: snags }, { data: safety }] = await Promise.all([
        filt(sb.from("quality_inspections").select("id, title, status")),
        filt(sb.from("ncrs").select("id, ncr_number, status, severity")),
        filt(sb.from("snags").select("id, status")),
        filt(sb.from("safety_inspections").select("id, status, score")),
      ]);
      out.sections.qhse = { inspections: insp ?? [], ncrs: ncrs ?? [], snags: snags ?? [], safety: safety ?? [] };
    }

    if (data.sections.includes("procurement")) {
      const [{ data: pr }, { data: po }, { data: del }] = await Promise.all([
        filt(sb.from("procurement_requests").select("id, request_number, status, estimated_cost")),
        filt(sb.from("purchase_orders").select("id, po_number, status, total_amount")),
        filt(sb.from("deliveries").select("id, delivery_note, status")),
      ]);
      out.sections.procurement = { requests: pr ?? [], orders: po ?? [], deliveries: del ?? [] };
    }

    if (data.sections.includes("stakeholder")) {
      const [{ data: ms }, { data: appr }] = await Promise.all([
        filt(sb.from("milestones").select("name, due_date, completed_at").order("due_date")),
        filt(sb.from("approvals").select("title, status").in("status", ["submitted","under_review"])),
      ]);
      out.sections.stakeholder = { milestones: ms ?? [], approvals: appr ?? [] };
    }

    return out;
  });
