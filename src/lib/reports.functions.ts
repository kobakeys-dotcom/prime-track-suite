import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type ReportKind = "daily" | "weekly" | "rfi_log" | "submittal_log" | "boq" | "document_register";

const palette = { ink: [0.04, 0.05, 0.06], accent: [0.98, 0.45, 0.09], muted: [0.4, 0.4, 0.42] };

export const generatePdfReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    kind: z.enum(["daily", "weekly", "rfi_log", "submittal_log", "boq", "document_register"]),
    projectId: z.string().uuid().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const sb = context.supabase;

    const title = ({
      daily: "Daily Reports", weekly: "Weekly Summary", rfi_log: "RFI Log",
      submittal_log: "Submittal Log", boq: "BOQ Progress", document_register: "Document Register",
    } as Record<ReportKind, string>)[data.kind];

    let rows: { cols: string[] }[] = [];
    let headers: string[] = [];

    if (data.kind === "daily" || data.kind === "weekly") {
      const since = data.kind === "weekly" ? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) : undefined;
      let q = sb.from("daily_reports").select("report_date, weather, work_completed, status, projects(name)").order("report_date", { ascending: false }).limit(50);
      if (data.projectId) q = q.eq("project_id", data.projectId);
      if (since) q = q.gte("report_date", since);
      const { data: r } = await q;
      headers = ["Date", "Project", "Weather", "Work completed", "Status"];
      rows = (r ?? []).map((x: any) => ({ cols: [x.report_date, x.projects?.name ?? "—", x.weather ?? "—", (x.work_completed ?? "—").slice(0, 60), x.status] }));
    } else if (data.kind === "rfi_log") {
      let q = sb.from("rfis").select("number, subject, status, due_date, projects(name)").order("created_at", { ascending: false });
      if (data.projectId) q = q.eq("project_id", data.projectId);
      const { data: r } = await q;
      headers = ["#", "Project", "Subject", "Status", "Due"];
      rows = (r ?? []).map((x: any) => ({ cols: [x.number ?? "—", x.projects?.name ?? "—", x.subject.slice(0, 50), x.status, x.due_date ?? "—"] }));
    } else if (data.kind === "submittal_log") {
      let q = sb.from("submittals").select("number, title, spec_section, status, due_date, projects(name)").order("created_at", { ascending: false });
      if (data.projectId) q = q.eq("project_id", data.projectId);
      const { data: r } = await q;
      headers = ["#", "Project", "Title", "Spec", "Status", "Due"];
      rows = (r ?? []).map((x: any) => ({ cols: [x.number ?? "—", x.projects?.name ?? "—", x.title.slice(0, 40), x.spec_section ?? "—", x.status, x.due_date ?? "—"] }));
    } else if (data.kind === "boq") {
      let q = sb.from("boq_items").select("item_code, description, unit, quantity, completed_qty, unit_rate, projects(name)").order("item_code");
      if (data.projectId) q = q.eq("project_id", data.projectId);
      const { data: r } = await q;
      headers = ["Code", "Project", "Description", "Unit", "Qty", "Done", "Progress"];
      rows = (r ?? []).map((x: any) => {
        const pct = x.quantity > 0 ? Math.round((Number(x.completed_qty) / Number(x.quantity)) * 100) : 0;
        return { cols: [x.item_code ?? "—", x.projects?.name ?? "—", x.description.slice(0, 40), x.unit ?? "—", String(x.quantity), String(x.completed_qty), `${pct}%`] };
      });
    } else {
      let q = sb.from("documents").select("name, category, expires_at, projects(name), created_at").order("created_at", { ascending: false });
      if (data.projectId) q = q.eq("project_id", data.projectId);
      const { data: r } = await q;
      headers = ["Name", "Project", "Category", "Expires", "Uploaded"];
      rows = (r ?? []).map((x: any) => ({ cols: [x.name.slice(0, 40), x.projects?.name ?? "—", x.category ?? "—", x.expires_at ?? "—", x.created_at.slice(0, 10)] }));
    }

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    const w = 842, h = 595; // A4 landscape
    const drawPage = (pageRows: { cols: string[] }[], pageNum: number, totalPages: number) => {
      const page = doc.addPage([w, h]);
      page.drawText("PROJECTCORE", { x: 40, y: h - 40, size: 9, font: bold, color: rgb(...palette.accent as [number, number, number]) });
      page.drawText(title.toUpperCase(), { x: 40, y: h - 65, size: 18, font: bold, color: rgb(...palette.ink as [number, number, number]) });
      page.drawText(`Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")}`, { x: 40, y: h - 82, size: 8, font, color: rgb(...palette.muted as [number, number, number]) });

      const cols = headers.length;
      const colWidth = (w - 80) / cols;
      let y = h - 120;

      headers.forEach((label, i) => {
        page.drawText(label.toUpperCase(), { x: 40 + i * colWidth, y, size: 8, font: bold, color: rgb(...palette.muted as [number, number, number]) });
      });
      page.drawLine({ start: { x: 40, y: y - 4 }, end: { x: w - 40, y: y - 4 }, color: rgb(...palette.ink as [number, number, number]), thickness: 0.5 });
      y -= 18;

      pageRows.forEach((row) => {
        row.cols.forEach((val, i) => {
          page.drawText(String(val ?? "—").slice(0, 50), { x: 40 + i * colWidth, y, size: 9, font, color: rgb(...palette.ink as [number, number, number]) });
        });
        y -= 16;
      });

      page.drawText(`Page ${pageNum} of ${totalPages}`, { x: w - 90, y: 20, size: 8, font, color: rgb(...palette.muted as [number, number, number]) });
    };

    const perPage = 25;
    const chunks: { cols: string[] }[][] = [];
    if (rows.length === 0) chunks.push([{ cols: headers.map(() => "—") }]);
    else for (let i = 0; i < rows.length; i += perPage) chunks.push(rows.slice(i, i + perPage));
    chunks.forEach((chunk, i) => drawPage(chunk, i + 1, chunks.length));

    const bytes = await doc.save();
    // base64 encode
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const base64 = btoa(bin);
    return { filename: `${data.kind}-${new Date().toISOString().slice(0, 10)}.pdf`, base64 };
  });
