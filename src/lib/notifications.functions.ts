import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, title, body, severity, link, read_at, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    const unread = (data ?? []).filter((n) => !n.read_at).length;
    return { items: data ?? [], unread };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const q = context.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", context.userId).is("read_at", null);
    const { error } = data.id ? await q.eq("id", data.id) : await q;
    if (error) throw error;
    return { ok: true };
  });

export const getMyPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notification_preferences").select("*").eq("user_id", context.userId).maybeSingle();
    return data ?? { user_id: context.userId, email_enabled: true, in_app_enabled: true, whatsapp_enabled: false, reminder_days: 3 };
  });

export const updateMyPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    email_enabled: z.boolean(),
    in_app_enabled: z.boolean(),
    whatsapp_enabled: z.boolean(),
    reminder_days: z.number().int().min(0).max(30),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("notification_preferences")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });
