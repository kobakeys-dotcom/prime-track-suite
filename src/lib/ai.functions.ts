import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const askAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    prompt: z.string().min(1).max(8000),
    system: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
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
      if (/402/.test(msg)) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
      throw new Error(msg);
    }
  });
