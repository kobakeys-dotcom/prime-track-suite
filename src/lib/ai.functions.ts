import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RESTRICTED_COST_ROLES = ["company_admin", "project_director", "project_manager", "finance_manager", "quantity_surveyor"];
const CLIENT_ROLES = ["client_representative"];

async function getUserRoles(supabase: any, userId: string): Promise<string[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r: any) => r.role);
}

function canSeeCost(roles: string[]) {
  return roles.some((r) => RESTRICTED_COST_ROLES.includes(r));
}
function isClientOnly(roles: string[]) {
  return roles.length > 0 && roles.every((r) => CLIENT_ROLES.includes(r));
}

async function buildProjectContext(supabase: any, projectId: string, opts: { includeCost: boolean; clientMode: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const [project, tasks, overdueTasks, milestones, rfis, submittals, issues, ncrs, risks, deliveries, qa, safety, daily, meetings, variations, payments] = await Promise.all([
    supabase.from("projects").select("name,code,status,start_date,end_date,progress_percentage,client_name,location,description" + (opts.includeCost ? ",contract_value,budget_amount" : "")).eq("id", projectId).maybeSingle(),
    supabase.from("tasks").select("id,title,status,due_date,priority").eq("project_id", projectId).limit(50),
    supabase.from("tasks").select("id,title,due_date,status").eq("project_id", projectId).lt("due_date", today).neq("status", "done").limit(30),
    supabase.from("milestones").select("name,due_date,status").eq("project_id", projectId).limit(20),
    supabase.from("rfis").select("rfi_number,subject,status,due_date").eq("project_id", projectId).limit(30),
    supabase.from("submittals").select("submittal_number,title,status,due_date").eq("project_id", projectId).limit(30),
    supabase.from("issues").select("title,status,priority,due_date").eq("project_id", projectId).limit(30),
    supabase.from("ncrs").select("ncr_number,title,status,severity").eq("project_id", projectId).limit(20),
    supabase.from("risks").select("title,status,risk_level,mitigation_status").eq("project_id", projectId).limit(20),
    supabase.from("deliveries").select("delivery_number,status,delivery_date,supplier_name").eq("project_id", projectId).limit(20),
    supabase.from("quality_inspections").select("inspection_number,status,result").eq("project_id", projectId).limit(20),
    supabase.from("safety_inspections").select("inspection_number,status,result").eq("project_id", projectId).limit(20),
    supabase.from("daily_reports").select("report_date,work_completed,status").eq("project_id", projectId).order("report_date", { ascending: false }).limit(10),
    supabase.from("meetings").select("title,meeting_date,status").eq("project_id", projectId).order("meeting_date", { ascending: false }).limit(10),
    opts.includeCost ? supabase.from("variations").select("variation_number,title,status,total_amount").eq("project_id", projectId).limit(20) : Promise.resolve({ data: [] }),
    opts.includeCost ? supabase.from("payment_claims").select("claim_number,status,submitted_amount,certified_amount").eq("project_id", projectId).limit(20) : Promise.resolve({ data: [] }),
  ]);

  const ctx: any = {
    project: project.data,
    counts: {
      tasks_total: (tasks.data ?? []).length,
      tasks_overdue: (overdueTasks.data ?? []).length,
      rfis_open: (rfis.data ?? []).filter((r: any) => ["submitted", "under_review", "revise_resubmit"].includes(r.status)).length,
      submittals_pending: (submittals.data ?? []).filter((s: any) => ["submitted", "under_review"].includes(s.status)).length,
      issues_open: (issues.data ?? []).filter((i: any) => i.status !== "closed").length,
      ncrs_open: (ncrs.data ?? []).filter((n: any) => n.status !== "closed").length,
      risks_high: (risks.data ?? []).filter((r: any) => ["high", "critical"].includes(r.risk_level)).length,
    },
    overdue_tasks: overdueTasks.data,
    milestones: milestones.data,
    rfis: rfis.data,
    submittals: submittals.data,
    issues: issues.data,
    ncrs: ncrs.data,
    risks: risks.data,
    deliveries: deliveries.data,
    quality: qa.data,
    safety: safety.data,
    daily_reports: daily.data,
    meetings: meetings.data,
  };
  if (opts.includeCost) {
    ctx.variations = variations.data;
    ctx.payment_claims = payments.data;
  }
  if (opts.clientMode) {
    delete ctx.variations;
    delete ctx.payment_claims;
    if (ctx.project) {
      delete ctx.project.contract_value;
      delete ctx.project.budget_amount;
    }
  }
  return ctx;
}

// ============ Conversations ============
export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("*, projects(name)")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  });

export const getConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [conv, msgs] = await Promise.all([
      supabase.from("ai_conversations").select("*").eq("id", data.id).maybeSingle(),
      supabase.from("ai_messages").select("*").eq("conversation_id", data.id).order("created_at", { ascending: true }),
    ]);
    if (conv.error) throw conv.error;
    return { conversation: conv.data, messages: msgs.data ?? [] };
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      title: z.string().max(200).optional(),
      project_id: z.string().uuid().nullable().optional(),
      conversation_type: z.string().max(80).optional(),
      context_module: z.string().max(80).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
    if (!profile?.company_id) throw new Error("No company context");
    const { data: row, error } = await supabase
      .from("ai_conversations")
      .insert({
        company_id: profile.company_id,
        project_id: data.project_id ?? null,
        user_id: userId,
        conversation_title: data.title ?? "New conversation",
        conversation_type: data.conversation_type ?? "Project Assistant",
        context_module: data.context_module ?? null,
        created_by: userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const archiveConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ai_conversations").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ Send message ============
export const sendAIMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      conversation_id: z.string().uuid(),
      prompt: z.string().min(1).max(8000),
      mode: z.string().max(80).optional(),
      project_id: z.string().uuid().nullable().optional(),
      context_module: z.string().max(80).nullable().optional(),
      system_prompt: z.string().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
    if (!profile?.company_id) throw new Error("No company context");
    const roles = await getUserRoles(supabase, userId);
    const clientMode = isClientOnly(roles) || data.mode === "Client-Friendly Summary";
    const includeCost = canSeeCost(roles) && !clientMode;

    // Save user message
    await supabase.from("ai_messages").insert({
      company_id: profile.company_id,
      project_id: data.project_id ?? null,
      conversation_id: data.conversation_id,
      user_id: userId,
      role: "user",
      message_text: data.prompt,
      context_module: data.context_module ?? null,
    });

    // Build context
    let contextBlock = "";
    if (data.project_id) {
      const ctx = await buildProjectContext(supabase, data.project_id, { includeCost, clientMode });
      contextBlock = `\n\nPROJECT CONTEXT (only use what is provided; do not invent):\n${JSON.stringify(ctx).slice(0, 30000)}`;
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      const errMsg = "AI Assistant requires an AI API / Edge Function setup. Prompt templates and manual project helper tools are available now.";
      const { data: ai } = await supabase.from("ai_messages").insert({
        company_id: profile.company_id,
        project_id: data.project_id ?? null,
        conversation_id: data.conversation_id,
        role: "assistant",
        message_text: errMsg,
        status: "Failed",
        error_message: "LOVABLE_API_KEY missing",
      }).select("*").single();
      await supabase.from("ai_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", data.conversation_id);
      return { message: ai, configured: false };
    }

    const systemBase = data.system_prompt ?? "You are an expert construction project management assistant. Be concise, structured, and pragmatic. Use sections: Summary, Key Findings, Concerns/Risks, Recommended Actions, Decisions Required, Data Gaps. Always note 'based on available data' where appropriate. Do not invent facts.";
    const clientSuffix = clientMode ? "\nCLIENT MODE: Use only client-safe data. No internal cost, payroll, supplier pricing, or internal-only issues. Maintain a professional tone." : "";
    const costSuffix = !includeCost && !clientMode ? "\nNOTE: Cost/commercial data is restricted for this user — do not invent financial figures." : "";

    try {
      const { generateText } = await import("ai");
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(key);
      const { text, usage } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system: systemBase + clientSuffix + costSuffix,
        prompt: data.prompt + contextBlock,
      });
      const { data: ai } = await supabase.from("ai_messages").insert({
        company_id: profile.company_id,
        project_id: data.project_id ?? null,
        conversation_id: data.conversation_id,
        role: "assistant",
        message_text: text,
        ai_model: "google/gemini-3-flash-preview",
        prompt_tokens: usage?.inputTokens ?? null,
        completion_tokens: usage?.outputTokens ?? null,
        token_count: usage?.totalTokens ?? null,
      }).select("*").single();
      await supabase.from("ai_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", data.conversation_id);
      return { message: ai, configured: true };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      let friendly = msg;
      if (/429/.test(msg)) friendly = "AI rate limit reached. Please retry shortly.";
      if (/402/.test(msg)) friendly = "AI credits exhausted. Add credits in Workspace → Usage.";
      const { data: ai } = await supabase.from("ai_messages").insert({
        company_id: profile.company_id,
        project_id: data.project_id ?? null,
        conversation_id: data.conversation_id,
        role: "assistant",
        message_text: friendly,
        status: "Failed",
        error_message: msg.slice(0, 500),
      }).select("*").single();
      return { message: ai, configured: true, error: friendly };
    }
  });

// ============ Templates ============
export const listPromptTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ai_prompt_templates")
      .select("*")
      .eq("is_active", true)
      .order("template_category", { ascending: true })
      .order("template_name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

// ============ Saved outputs ============
export const listSavedOutputs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid().nullable().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("ai_saved_outputs").select("*, projects(name)").order("created_at", { ascending: false }).limit(200);
    if (data.project_id) q = q.eq("project_id", data.project_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const saveAIOutput = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      title: z.string().min(1).max(200),
      output_type: z.string().max(80).optional(),
      output_text: z.string().min(1),
      project_id: z.string().uuid().nullable().optional(),
      conversation_id: z.string().uuid().nullable().optional(),
      message_id: z.string().uuid().nullable().optional(),
      context_module: z.string().max(80).nullable().optional(),
      is_client_visible: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
    if (!profile?.company_id) throw new Error("No company context");
    const { data: row, error } = await supabase
      .from("ai_saved_outputs")
      .insert({
        company_id: profile.company_id,
        project_id: data.project_id ?? null,
        conversation_id: data.conversation_id ?? null,
        message_id: data.message_id ?? null,
        output_title: data.title,
        output_type: data.output_type ?? "Summary",
        output_text: data.output_text,
        context_module: data.context_module ?? null,
        saved_by: userId,
        is_client_visible: data.is_client_visible ?? false,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteSavedOutput = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ai_saved_outputs").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ Feedback ============
export const submitAIFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      message_id: z.string().uuid(),
      conversation_id: z.string().uuid(),
      rating: z.enum(["up", "down"]),
      feedback_text: z.string().max(1000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
    if (!profile?.company_id) throw new Error("No company context");
    const { error } = await supabase.from("ai_feedback").insert({
      company_id: profile.company_id,
      message_id: data.message_id,
      conversation_id: data.conversation_id,
      user_id: userId,
      rating: data.rating,
      feedback_text: data.feedback_text ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

// ============ Projects list for selector ============
export const listProjectsForAI = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("projects").select("id,name,code,status").order("name");
    if (error) throw error;
    return data ?? [];
  });

// Backward-compat
export const askAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ prompt: z.string().min(1).max(8000), system: z.string().max(2000).optional() }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI Assistant requires an AI API / Edge Function setup.");
    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system: data.system ?? "You are an expert construction project management assistant. Be concise, structured, and pragmatic.",
        prompt: data.prompt,
      });
      return { text };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (/429/.test(msg)) throw new Error("AI rate limit reached. Please retry shortly.");
      if (/402/.test(msg)) throw new Error("AI credits exhausted.");
      throw new Error(msg);
    }
  });
