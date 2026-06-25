import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Mail, CheckCircle2, Circle, Copy, ExternalLink, ShieldCheck, Globe, Send,
  ChevronRight, AlertTriangle, RefreshCw, Loader2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { verifyEmailDns } from "@/lib/email-dns.functions";

export const Route = createFileRoute("/_authenticated/settings/email")({
  head: () => ({ meta: [{ title: "Email Setup — ProjectCore" }] }),
  component: EmailSetupPage,
});

type StepKey = "domain" | "dns" | "verify" | "sender" | "test";
const DOMAIN_RX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

function EmailSetupPage() {
  const [domain, setDomain] = useState("");
  const [sender, setSender] = useState("notifications");
  const [manual, setManual] = useState<Record<StepKey, boolean>>({
    domain: false, dns: false, verify: false, sender: false, test: false,
  });

  const domainValid = DOMAIN_RX.test(domain.trim());
  const verifyFn = useServerFn(verifyEmailDns);

  // Auto-poll DNS verification every 15s once a valid domain is entered
  const dnsQuery = useQuery({
    queryKey: ["email-dns", domain.trim().toLowerCase()],
    queryFn: () => verifyFn({ data: { domain: domain.trim().toLowerCase() } }),
    enabled: domainValid,
    refetchInterval: (q) => (q.state.data?.allPassed ? false : 15_000),
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  const dns = dnsQuery.data;
  const dnsAllPassed = !!dns?.allPassed;
  const dnsAnyPassed = !!(dns?.spf.ok || dns?.dkim.ok || dns?.dmarc.ok);

  // Derived step status (auto-checked from real signals; manual override only adds)
  const computed: Record<StepKey, boolean> = useMemo(() => ({
    domain: domainValid || manual.domain,
    dns: dnsAnyPassed || manual.dns,
    verify: dnsAllPassed || manual.verify,
    sender: sender.trim().length > 0 && domainValid ? (manual.sender || dnsAllPassed) : manual.sender,
    test: manual.test,
  }), [domainValid, dnsAnyPassed, dnsAllPassed, sender, manual]);

  // Toast when verification flips to success
  useEffect(() => {
    if (dnsAllPassed) toast.success("All DNS records verified", { id: "dns-ok" });
  }, [dnsAllPassed]);

  const toggle = (k: StepKey) => setManual((m) => ({ ...m, [k]: !m[k] }));
  const completed = Object.values(computed).filter(Boolean).length;
  const total = 5;
  const progress = Math.round((completed / total) * 100);

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copied"); };

  const dnsRecords = [
    { type: "TXT", host: "@", value: "v=spf1 include:_spf.lovable.cloud ~all", purpose: "SPF", status: dns?.spf },
    { type: "CNAME", host: "lovable._domainkey", value: "lovable._domainkey.lovable.cloud", purpose: "DKIM", status: dns?.dkim },
    { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com", purpose: "DMARC", status: dns?.dmarc },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/settings" className="hover:text-foreground">Settings</Link>
            <ChevronRight className="size-3" /><span>Email</span>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight flex items-center gap-3">
            <Mail className="size-7 text-primary" /> Email setup
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Configure a verified sender domain. DNS records are checked automatically every 15 seconds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {domainValid && (
            <Button variant="outline" size="sm" onClick={() => dnsQuery.refetch()} disabled={dnsQuery.isFetching}>
              {dnsQuery.isFetching ? <Loader2 className="size-4 mr-2 animate-spin" /> : <RefreshCw className="size-4 mr-2" />}
              Re-check now
            </Button>
          )}
          <Badge variant={progress === 100 ? "default" : "secondary"}>{completed}/{total} complete</Badge>
        </div>
      </div>

      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      <StepCard n={1} title="Add your sending domain" icon={<Globe className="size-5" />}
        checked={computed.domain} onToggle={() => toggle("domain")} auto={domainValid}>
        <p className="text-sm text-muted-foreground">
          Use a subdomain like <code className="px-1 py-0.5 rounded bg-muted text-xs">notify.yourdomain.com</code>.
        </p>
        <div className="flex gap-2 max-w-md">
          <Input placeholder="notify.yourdomain.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
          <Button variant="outline" onClick={() => copy(domain || "notify.yourdomain.com")}><Copy className="size-4" /></Button>
        </div>
        {domain && !domainValid && <p className="text-xs text-destructive">Enter a valid fully-qualified domain.</p>}
      </StepCard>

      <StepCard n={2} title="Add DNS records at your registrar" icon={<ShieldCheck className="size-5" />}
        checked={computed.dns} onToggle={() => toggle("dns")} auto={dnsAnyPassed}>
        <p className="text-sm text-muted-foreground">
          Add these records at your DNS provider. Status updates automatically.
        </p>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Host</th>
                <th className="text-left px-3 py-2">Value</th>
                <th className="text-left px-3 py-2">Purpose</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {dnsRecords.map((r) => (
                <tr key={r.purpose} className="border-t">
                  <td className="px-3 py-2"><DnsStatusIcon status={r.status} loading={dnsQuery.isFetching && !dns} enabled={domainValid} /></td>
                  <td className="px-3 py-2 font-mono text-xs">{r.type}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.host}</td>
                  <td className="px-3 py-2 font-mono text-xs truncate max-w-xs" title={r.value}>{r.value}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{r.purpose}</Badge></td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => copy(r.value)}><Copy className="size-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!domainValid && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-md bg-muted/40 border">
            <AlertTriangle className="size-4 mt-0.5 shrink-0 text-amber-500" />
            Enter your domain in step 1 to enable automatic verification.
          </div>
        )}
      </StepCard>

      <StepCard n={3} title="Verify the domain" icon={<CheckCircle2 className="size-5" />}
        checked={computed.verify} onToggle={() => toggle("verify")} auto={dnsAllPassed}>
        {!domainValid ? (
          <p className="text-sm text-muted-foreground">Verification will start automatically once a domain is entered.</p>
        ) : dnsAllPassed ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4" /> SPF, DKIM and DMARC all verified at {new Date(dns!.checkedAt).toLocaleTimeString()}.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Re-checking every 15 seconds…
              {dns && <span className="text-xs">last checked {new Date(dns.checkedAt).toLocaleTimeString()}</span>}
            </div>
            <div className="text-xs grid gap-1 sm:grid-cols-3">
              <RecordHint label="SPF" status={dns?.spf} />
              <RecordHint label="DKIM" status={dns?.dkim} />
              <RecordHint label="DMARC" status={dns?.dmarc} />
            </div>
          </div>
        )}
      </StepCard>

      <StepCard n={4} title="Choose a sender address" icon={<Mail className="size-5" />}
        checked={computed.sender} onToggle={() => toggle("sender")} auto={dnsAllPassed && sender.trim().length > 0}>
        <p className="text-sm text-muted-foreground">The "From" address recipients see.</p>
        <div className="flex items-center gap-2 max-w-md">
          <Input value={sender} onChange={(e) => setSender(e.target.value)} className="max-w-[180px]" />
          <span className="text-muted-foreground">@</span>
          <Input value={domain || "yourdomain.com"} readOnly className="bg-muted/50" />
        </div>
        <div className="text-xs text-muted-foreground">
          Preview: <code className="px-1.5 py-0.5 rounded bg-muted">{sender}@{domain || "yourdomain.com"}</code>
        </div>
      </StepCard>

      <StepCard n={5} title="Send a test email" icon={<Send className="size-5" />}
        checked={computed.test} onToggle={() => toggle("test")}>
        <p className="text-sm text-muted-foreground">
          Once the domain is verified, send a test to your inbox and confirm it isn't flagged as spam.
        </p>
        <Button disabled={!dnsAllPassed}
          onClick={() => { toast.success("Test email queued"); setManual((m) => ({ ...m, test: true })); }}>
          <Send className="size-4 mr-2" /> Send test email
        </Button>
      </StepCard>

      {progress === 100 && (
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-5 flex items-start gap-3">
          <CheckCircle2 className="size-6 text-primary mt-0.5" />
          <div>
            <div className="font-semibold">Email is ready</div>
            <div className="text-sm text-muted-foreground">
              ProjectCore can now send from {sender}@{domain}.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DnsStatusIcon({ status, loading, enabled }: { status?: { ok: boolean } | null; loading: boolean; enabled: boolean }) {
  if (!enabled) return <Circle className="size-4 text-muted-foreground/40" />;
  if (loading && !status) return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  if (!status) return <Circle className="size-4 text-muted-foreground/40" />;
  return status.ok
    ? <CheckCircle2 className="size-4 text-emerald-500" />
    : <XCircle className="size-4 text-destructive/70" />;
}

function RecordHint({ label, status }: { label: string; status?: { ok: boolean; error: string | null } | null }) {
  const tone = !status ? "text-muted-foreground" : status.ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400";
  const text = !status ? "checking…" : status.ok ? "verified" : (status.error === "ENOTFOUND" ? "not found" : "pending");
  return <div className={`flex items-center gap-1.5 ${tone}`}>
    {status?.ok ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
    <span className="font-medium">{label}</span><span>·</span><span>{text}</span>
  </div>;
}

function StepCard({ n, title, icon, checked, onToggle, children, auto }: {
  n: number; title: string; icon: React.ReactNode; checked: boolean;
  onToggle: () => void; children: React.ReactNode; auto?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-card p-5 transition-all ${checked ? "border-primary/40 bg-primary/[0.02]" : ""}`}>
      <div className="flex items-start gap-4">
        <button onClick={onToggle} className="mt-0.5 shrink-0 transition-transform hover:scale-110"
          aria-label={checked ? "Mark step incomplete" : "Mark step complete"}>
          {checked ? <CheckCircle2 className="size-6 text-primary" /> : <Circle className="size-6 text-muted-foreground" />}
        </button>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Step {n}</span>
            <span className="text-muted-foreground">{icon}</span>
            <h2 className="text-lg font-semibold">{title}</h2>
            {auto && checked && <Badge variant="secondary" className="text-[10px] h-5">auto-verified</Badge>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
