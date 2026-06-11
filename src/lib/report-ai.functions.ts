import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Mirror of MODULE_CONFIG keys / columns kept lightweight for AI prompt context.
const MODULE_INDEX: Record<string, { label: string; category: string; columns: string[] }> = {
  projects: { label: "Projects", category: "Project Management", columns: ["code","name","status","progress","start_date","end_date","budget"] },
  tasks: { label: "Tasks", category: "Project Management", columns: ["title","status","priority","due_date","assigned_to"] },
  milestones: { label: "Milestones", category: "Project Management", columns: ["name","due_date","status","completed_at"] },
  daily_reports: { label: "Daily Reports", category: "Progress", columns: ["report_date","weather","status","work_completed"] },
  issues: { label: "Issues", category: "Project Management", columns: ["title","status","priority","due_date"] },
  snags: { label: "Snags", category: "Quality", columns: ["title","status","location"] },
  meetings: { label: "Meetings", category: "Meetings", columns: ["title","meeting_date","status"] },
  approvals: { label: "Approvals", category: "Approvals", columns: ["title","entity_type","status"] },
  rfis: { label: "RFIs", category: "Approvals", columns: ["rfi_number","subject","status","due_date"] },
  submittals: { label: "Submittals", category: "Approvals", columns: ["submittal_number","title","status","due_date"] },
  boq_items: { label: "BOQ Items", category: "Commercial / Cost", columns: ["item_code","description","unit","quantity","completed_qty","unit_rate"] },
  variations: { label: "Variations", category: "Commercial / Cost", columns: ["variation_number","title","status","cost_impact","approved_amount"] },
  payment_claims: { label: "Payment Claims", category: "Finance / Cash Flow", columns: ["claim_number","status","net_claim","period_end"] },
  cash_flow_entries: { label: "Cash Flow", category: "Finance / Cash Flow", columns: ["entry_date","entry_type","amount","status"] },
  procurement_requests: { label: "Material Requests", category: "Procurement", columns: ["request_number","material_name","status","estimated_cost"] },
  rfqs: { label: "RFQs", category: "Procurement", columns: ["rfq_number","title","status"] },
  purchase_orders: { label: "Purchase Orders", category: "Procurement", columns: ["po_number","status","total_amount"] },
  deliveries: { label: "Deliveries", category: "Procurement", columns: ["delivery_note","delivery_date","status"] },
  suppliers: { label: "Suppliers", category: "Procurement", columns: ["name","category","status"] },
  quality_inspections: { label: "Quality Inspections", category: "Quality", columns: ["inspection_number","title","status","result"] },
  ncrs: { label: "NCRs", category: "Quality", columns: ["ncr_number","title","severity","status"] },
  safety_inspections: { label: "Safety Inspections", category: "Safety / HSE", columns: ["inspection_number","title","score","status"] },
  safety_hazards: { label: "Safety Hazards", category: "Safety / HSE", columns: ["title","severity","status"] },
  risks: { label: "Risks", category: "Risk", columns: ["risk_number","title","risk_level","risk_score","status"] },
  manpower_records: { label: "Manpower", category: "Resources", columns: ["record_date","trade","total_workers","total_hours"] },
  equipment: { label: "Equipment", category: "Resources", columns: ["equipment_code","name","equipment_type","status"] },
  timesheets: { label: "Timesheets", category: "Resources", columns: ["timesheet_number","period_start","period_end","total_hours","status"] },
  documents: { label: "Documents", category: "Documents", columns: ["document_number","name","status","expires_at"] },
  drawings: { label: "Drawings", category: "Drawings", columns: ["drawing_number","title","discipline","status"] },
};

const ConfigSchema = z.object({
  module: z.string(),
  selected_columns: z.array(z.string()).optional(),
  date_from: z.string().nullable().optional(),
  date_to: z.string().nullable().optional(),
  chart_type: z.enum(["none","bar","line","pie","donut","area"]).optional(),
  group_by: z.string().nullable().optional(),
  sort_by: z.string().nullable().optional(),
  summary_style: z.string().optional(),
  rationale: z.string().optional(),
});

export const interpretAIReportPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    prompt: z.string().min(3).max(2000),
    project_id: z.string().uuid().optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const key = process.env.LOVABLE_API_KEY;
    const sb = context.supabase as any;
    const { data: prof } = await sb.from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    const companyId = prof?.company_id;

    if (!key) {
      const err = "AI is not configured. Set LOVABLE_API_KEY to enable AI report generation.";
      if (companyId) await sb.from("custom_report_ai_prompts").insert({
        company_id: companyId, user_id: context.userId, project_id: data.project_id ?? null,
        prompt_text: data.prompt, status: "Failed", error_message: err,
      });
      throw new Error(err);
    }

    const moduleList = Object.entries(MODULE_INDEX)
      .map(([k, v]) => `- ${k} (${v.label} / ${v.category}): columns=[${v.columns.join(", ")}]`).join("\n");

    const system = `You convert a construction project management report request into a SAFE JSON config. 
Pick exactly ONE module from the catalog below. Choose columns ONLY from that module's columns. 
NEVER produce SQL. NEVER invent columns. Return ONLY valid JSON, no prose, no markdown fences.

JSON shape:
{
  "module": "<one of the module keys>",
  "selected_columns": ["col1","col2"],
  "date_from": "YYYY-MM-DD" | null,
  "date_to": "YYYY-MM-DD" | null,
  "chart_type": "none"|"bar"|"line"|"pie"|"donut"|"area",
  "group_by": "<column or null>",
  "sort_by": "<column or null>",
  "summary_style": "Executive"|"Detailed"|"Client-friendly"|"Internal",
  "rationale": "1-2 sentences why"
}

Module catalog:
${moduleList}

Today is ${new Date().toISOString().slice(0,10)}.`;

    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    let raw = "";
    try {
      const r = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        prompt: `User request: ${data.prompt}\n\nReturn ONLY the JSON config.`,
      });
      raw = r.text ?? "";
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (companyId) await sb.from("custom_report_ai_prompts").insert({
        company_id: companyId, user_id: context.userId, project_id: data.project_id ?? null,
        prompt_text: data.prompt, status: "Failed", error_message: msg,
      });
      if (/429/.test(msg)) throw new Error("AI rate limit reached. Please retry shortly.");
      if (/402/.test(msg)) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
      throw new Error(msg);
    }

    // Strip code fences if present
    let jsonText = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
    let parsed: any;
    try { parsed = JSON.parse(jsonText); } catch {
      const m = jsonText.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]);
    }
    let config: z.infer<typeof ConfigSchema>;
    try { config = ConfigSchema.parse(parsed); } catch (e: any) {
      if (companyId) await sb.from("custom_report_ai_prompts").insert({
        company_id: companyId, user_id: context.userId, project_id: data.project_id ?? null,
        prompt_text: data.prompt, ai_response: raw, status: "Failed",
        error_message: "AI returned invalid config: " + (e?.message ?? "parse error"),
      });
      throw new Error("AI returned an invalid report config. Try rephrasing your prompt.");
    }

    const idx = MODULE_INDEX[config.module];
    if (!idx) throw new Error(`AI picked unknown module: ${config.module}`);
    // Whitelist columns
    const allowed = new Set(idx.columns);
    config.selected_columns = (config.selected_columns ?? []).filter((c) => allowed.has(c));
    if (!config.selected_columns.length) config.selected_columns = idx.columns.slice(0, 5);
    if (config.group_by && !allowed.has(config.group_by)) config.group_by = null;
    if (config.sort_by && !allowed.has(config.sort_by)) config.sort_by = null;

    if (companyId) await sb.from("custom_report_ai_prompts").insert({
      company_id: companyId, user_id: context.userId, project_id: data.project_id ?? null,
      prompt_text: data.prompt, ai_response: raw, status: "Completed",
      interpreted_module: config.module,
      interpreted_filters: { date_from: config.date_from, date_to: config.date_to, project_id: data.project_id ?? null },
      interpreted_columns: config.selected_columns,
      interpreted_chart_config: { chart_type: config.chart_type, group_by: config.group_by, sort_by: config.sort_by },
    });

    return { config, module_label: idx.label, module_category: idx.category, available_columns: idx.columns };
  });

export const generateAIReportSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    module_label: z.string(),
    rows: z.array(z.record(z.string(), z.any())).max(500),
    columns: z.array(z.object({ key: z.string(), label: z.string() })),
    summary_kpis: z.record(z.string(), z.any()).optional(),
    style: z.enum(["Executive","Detailed","Client-friendly","Internal","Commercial","Site","QA/QC","HSE","Procurement"]).optional(),
    mode: z.enum(["summary","insights","recommendations","narrative"]).default("summary"),
    project_name: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured (LOVABLE_API_KEY missing).");

    const sample = data.rows.slice(0, 80);
    const colHeader = data.columns.map((c) => c.label).join(" | ");
    const lines = sample.map((r) => data.columns.map((c) => {
      const v = r[c.key]; return v == null ? "—" : String(v).slice(0, 60);
    }).join(" | "));
    const tableText = [colHeader, ...lines].join("\n");

    const modeInstr = {
      summary: "Write a concise summary of what this report shows. Highlight totals, status mix, and any obvious issues.",
      insights: "Extract 4-6 bullet-point insights: trends, outliers, concentrations, risks suggested by the data.",
      recommendations: "List 4-6 concrete recommended actions a project manager should take based on this data.",
      narrative: "Write a short professional narrative (2-3 paragraphs) suitable to share by email.",
    }[data.mode];

    const styleNote = data.style ? `Tone/style: ${data.style}.` : "";
    const projectNote = data.project_name ? `Project: ${data.project_name}.` : "";

    const system = `You are a construction project controls analyst. Use ONLY the report data provided. 
If data is insufficient, say so plainly. Never fabricate numbers. ${styleNote}`;
    const prompt = `${projectNote}
Report module: ${data.module_label}
Rows in sample: ${sample.length} (of ${data.rows.length} total)
KPIs: ${JSON.stringify(data.summary_kpis ?? {})}

Data table (truncated):
${tableText}

Task: ${modeInstr}`;

    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system, prompt,
      });
      return { text };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (/429/.test(msg)) throw new Error("AI rate limit reached. Please retry shortly.");
      if (/402/.test(msg)) throw new Error("AI credits exhausted.");
      throw new Error(msg);
    }
  });

export const listAIPromptHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data } = await sb.from("custom_report_ai_prompts").select("*")
      .order("created_at", { ascending: false }).limit(50);
    return data ?? [];
  });
