import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("documents")
      .select("id, name, category, expires_at, file_url, file_size, project_id, created_at, projects(name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ ...r, project_name: r.projects?.name ?? "—" }));
  });

export const createDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    project_id: z.string().uuid().nullable(),
    name: z.string().min(1).max(200),
    category: z.string().max(100).optional().nullable(),
    expires_at: z.string().optional().nullable(),
    file_url: z.string().max(500).optional().nullable(),
    file_size: z.number().optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: profile } = await context.supabase
      .from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    const { data: row, error } = await context.supabase
      .from("documents").insert({
        ...data, company_id: profile?.company_id, uploaded_by: context.userId,
      }).select().single();
    if (error) throw error;
    return row;
  });

export const listDrawings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("drawings")
      .select("id, number, title, discipline, revision, issued_date, file_url, project_id, created_at, projects(name)")
      .order("number", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ ...r, project_name: r.projects?.name ?? "—" }));
  });

export const createDrawing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    project_id: z.string().uuid(),
    number: z.string().min(1).max(50),
    title: z.string().max(200).optional().nullable(),
    discipline: z.string().max(50).optional().nullable(),
    revision: z.string().max(20).optional().nullable(),
    issued_date: z.string().optional().nullable(),
    file_url: z.string().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.from("drawings").insert(data).select().single();
    if (error) throw error;
    return row;
  });

export const getUploadSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    filename: z.string().min(1).max(200),
    content_type: z.string().max(100).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: profile } = await context.supabase
      .from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    if (!profile?.company_id) throw new Error("Company missing");
    const path = `${profile.company_id}/${Date.now()}-${data.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { data: signed, error } = await context.supabase.storage
      .from("project-files").createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const getDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1) }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("project-files").createSignedUrl(data.path, 300);
    if (error) throw error;
    return { url: signed.signedUrl };
  });
