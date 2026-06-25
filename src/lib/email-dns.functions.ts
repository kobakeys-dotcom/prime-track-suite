import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  domain: z.string().trim().min(3).max(253).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Invalid domain"),
});

type CheckResult = { ok: boolean; found: string | null; error: string | null };

async function lookupTxt(host: string): Promise<CheckResult> {
  try {
    const { resolveTxt } = await import("dns/promises");
    const records = await resolveTxt(host);
    const flat = records.map((r) => r.join("")).join(" | ");
    return { ok: records.length > 0, found: flat || null, error: null };
  } catch (e: any) {
    return { ok: false, found: null, error: e?.code || "lookup_failed" };
  }
}

async function lookupCname(host: string): Promise<CheckResult> {
  try {
    const { resolveCname } = await import("dns/promises");
    const records = await resolveCname(host);
    return { ok: records.length > 0, found: records.join(", ") || null, error: null };
  } catch (e: any) {
    return { ok: false, found: null, error: e?.code || "lookup_failed" };
  }
}

export const verifyEmailDns = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const domain = data.domain.toLowerCase();

    const [spfRes, dkimRes, dmarcRes] = await Promise.all([
      lookupTxt(domain),
      lookupCname(`lovable._domainkey.${domain}`),
      lookupTxt(`_dmarc.${domain}`),
    ]);

    const spf = {
      ...spfRes,
      ok: !!spfRes.found && /v=spf1/i.test(spfRes.found),
    };
    const dkim = {
      ...dkimRes,
      ok: !!dkimRes.found && /lovable/i.test(dkimRes.found),
    };
    const dmarc = {
      ...dmarcRes,
      ok: !!dmarcRes.found && /v=dmarc1/i.test(dmarcRes.found),
    };

    return {
      domain,
      checkedAt: new Date().toISOString(),
      spf,
      dkim,
      dmarc,
      allPassed: spf.ok && dkim.ok && dmarc.ok,
    };
  });
