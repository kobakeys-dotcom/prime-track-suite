import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getClientSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const projectId = data.projectId;

    const [{ data: project }, { data: milestones }, { data: claims }, { data: vars }, { data: docs }, { data: approvals }, { data: photos }] = await Promise.all([
      sb.from("projects").select("id, name, code, client, location, status, progress, start_date, end_date, contract_value").eq("id", projectId).maybeSingle(),
      sb.from("milestones").select("id, title, due_date, status, completion_percentage").eq("project_id", projectId).order("due_date", { ascending: true }),
      sb.from("payment_claims").select("id, claim_number, period_end, gross_claim, net_claim, status").eq("project_id", projectId).order("period_end", { ascending: false }),
      sb.from("variations").select("id, variation_number, title, cost_impact, approved_amount, status").eq("project_id", projectId).order("created_at", { ascending: false }),
      sb.from("documents").select("id, name, category, created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(20),
      sb.from("approvals").select("id, title, status, requested_at").eq("project_id", projectId).order("requested_at", { ascending: false }).limit(10),
      sb.from("snags").select("photos").eq("project_id", projectId).not("photos", "is", null).limit(40),
    ]);

    const flatPhotos: string[] = [];
    (photos ?? []).forEach((s: any) => { (s.photos ?? []).forEach((u: string) => flatPhotos.push(u)); });

    return {
      project,
      milestones: milestones ?? [],
      claims: claims ?? [],
      variations: vars ?? [],
      documents: docs ?? [],
      approvals: approvals ?? [],
      photos: flatPhotos.slice(0, 12),
    };
  });
