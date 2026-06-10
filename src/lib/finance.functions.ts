import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const projectInput = z.object({ projectId: z.string().uuid().optional() });

export const getBudgetVsActual = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => projectInput.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let boqQ = sb.from("boq_items").select("project_id, quantity, completed_qty, unit_rate, projects(name)");
    if (data.projectId) boqQ = boqQ.eq("project_id", data.projectId);
    const { data: boq, error: e1 } = await boqQ;
    if (e1) throw e1;

    let varQ = sb.from("variations").select("project_id, amount, status");
    if (data.projectId) varQ = varQ.eq("project_id", data.projectId);
    const { data: vars } = await varQ;

    let pcQ = sb.from("payment_claims").select("project_id, net_amount, status");
    if (data.projectId) pcQ = pcQ.eq("project_id", data.projectId);
    const { data: claims } = await pcQ;

    const byProject = new Map<string, { name: string; budget: number; actual: number; variations: number; certified: number }>();
    (boq ?? []).forEach((r: any) => {
      const cur = byProject.get(r.project_id) ?? { name: r.projects?.name ?? "—", budget: 0, actual: 0, variations: 0, certified: 0 };
      cur.budget += Number(r.quantity ?? 0) * Number(r.unit_rate ?? 0);
      cur.actual += Number(r.completed_qty ?? 0) * Number(r.unit_rate ?? 0);
      byProject.set(r.project_id, cur);
    });
    (vars ?? []).forEach((v: any) => {
      if (v.status !== "approved") return;
      const cur = byProject.get(v.project_id) ?? { name: "—", budget: 0, actual: 0, variations: 0, certified: 0 };
      cur.variations += Number(v.amount ?? 0);
      byProject.set(v.project_id, cur);
    });
    (claims ?? []).forEach((c: any) => {
      if (!["approved", "paid"].includes(c.status)) return;
      const cur = byProject.get(c.project_id) ?? { name: "—", budget: 0, actual: 0, variations: 0, certified: 0 };
      cur.certified += Number(c.net_amount ?? 0);
      byProject.set(c.project_id, cur);
    });

    return Array.from(byProject.entries()).map(([id, v]) => ({ project_id: id, ...v, revised_budget: v.budget + v.variations }));
  });

export const getCashFlow = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => projectInput.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from("payment_claims").select("claim_date, net_amount, status, project_id").order("claim_date");
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    const buckets = new Map<string, { month: string; claimed: number; certified: number; paid: number }>();
    (rows ?? []).forEach((r: any) => {
      const month = (r.claim_date ?? "").slice(0, 7) || "—";
      const cur = buckets.get(month) ?? { month, claimed: 0, certified: 0, paid: 0 };
      const amt = Number(r.net_amount ?? 0);
      cur.claimed += amt;
      if (["approved", "paid"].includes(r.status)) cur.certified += amt;
      if (r.status === "paid") cur.paid += amt;
      buckets.set(month, cur);
    });
    return Array.from(buckets.values());
  });

export const calcPaymentClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    projectId: z.string().uuid(),
    retentionPct: z.number().min(0).max(50).default(10),
    advanceRecoveryPct: z.number().min(0).max(100).default(0),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: boq } = await sb.from("boq_items").select("quantity, completed_qty, unit_rate").eq("project_id", data.projectId);
    const { data: vars } = await sb.from("variations").select("amount, status").eq("project_id", data.projectId);
    const { data: prev } = await sb.from("payment_claims").select("gross_amount").eq("project_id", data.projectId).in("status", ["approved", "paid"]);

    const workDone = (boq ?? []).reduce((s: number, r: any) => s + Number(r.completed_qty ?? 0) * Number(r.unit_rate ?? 0), 0);
    const approvedVars = (vars ?? []).filter((v: any) => v.status === "approved").reduce((s: number, v: any) => s + Number(v.amount ?? 0), 0);
    const previousGross = (prev ?? []).reduce((s: number, p: any) => s + Number(p.gross_amount ?? 0), 0);

    const gross = workDone + approvedVars;
    const thisPeriodGross = Math.max(0, gross - previousGross);
    const retention = +(thisPeriodGross * (data.retentionPct / 100)).toFixed(2);
    const advanceRecovery = +(thisPeriodGross * (data.advanceRecoveryPct / 100)).toFixed(2);
    const net = +(thisPeriodGross - retention - advanceRecovery).toFixed(2);

    return {
      work_done_to_date: +workDone.toFixed(2),
      approved_variations: +approvedVars.toFixed(2),
      previous_gross: +previousGross.toFixed(2),
      gross_amount: +thisPeriodGross.toFixed(2),
      retention,
      advance_recovery: advanceRecovery,
      net_amount: net,
    };
  });
