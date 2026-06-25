import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, CheckCircle2, Circle, Copy, ExternalLink, ShieldCheck, Globe, Send, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings/email")({
  head: () => ({ meta: [{ title: "Email Setup — ProjectCore" }] }),
  component: EmailSetupPage,
});

type StepKey = "domain" | "dns" | "verify" | "sender" | "test";

function EmailSetupPage() {
  const [done, setDone] = useState<Record<StepKey, boolean>>({
    domain: false, dns: false, verify: false, sender: false, test: false,
  });
  const [domain, setDomain] = useState("");
  const [sender, setSender] = useState("notifications");

  const toggle = (k: StepKey) => setDone((d) => ({ ...d, [k]: !d[k] }));

  const completed = Object.values(done).filter(Boolean).length;
  const total = Object.keys(done).length;
  const progress = Math.round((completed / total) * 100);

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast.success("Copied to clipboard");
  };

  const dnsRecords = [
    { type: "TXT", host: "@", value: "v=spf1 include:_spf.lovable.cloud ~all", purpose: "SPF" },
    { type: "CNAME", host: "lovable._domainkey", value: "lovable._domainkey.lovable.cloud", purpose: "DKIM" },
    { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com", purpose: "DMARC" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/settings" className="hover:text-foreground">Settings</Link>
            <ChevronRight className="size-3" />
            <span>Email</span>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight flex items-center gap-3">
            <Mail className="size-7 text-primary" /> Email setup
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Configure a verified sender domain so ProjectCore can send notifications, approvals, and quotes from your brand.
          </p>
        </div>
        <Badge variant={progress === 100 ? "default" : "secondary"} className="text-xs">
          {completed}/{total} complete
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Step 1: Add domain */}
      <StepCard
        n={1}
        title="Add your sending domain"
        icon={<Globe className="size-5" />}
        checked={done.domain}
        onToggle={() => toggle("domain")}
      >
        <p className="text-sm text-muted-foreground">
          Use a subdomain like <code className="px-1 py-0.5 rounded bg-muted text-xs">notify.yourdomain.com</code> dedicated to app email. This keeps reputation isolated from your main mail.
        </p>
        <div className="flex gap-2 max-w-md">
          <Input placeholder="notify.yourdomain.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
          <Button variant="outline" onClick={() => copy(domain || "notify.yourdomain.com")}>
            <Copy className="size-4" />
          </Button>
        </div>
      </StepCard>

      {/* Step 2: DNS records */}
      <StepCard
        n={2}
        title="Add DNS records at your registrar"
        icon={<ShieldCheck className="size-5" />}
        checked={done.dns}
        onToggle={() => toggle("dns")}
      >
        <p className="text-sm text-muted-foreground">
          Sign in to your DNS provider (Cloudflare, GoDaddy, Namecheap, Route 53) and add these records. They authenticate your mail so it doesn't land in spam.
        </p>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
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
                  <td className="px-3 py-2 font-mono text-xs">{r.type}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.host}</td>
                  <td className="px-3 py-2 font-mono text-xs truncate max-w-xs" title={r.value}>{r.value}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{r.purpose}</Badge></td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => copy(r.value)}>
                      <Copy className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-md bg-muted/40 border">
          <AlertTriangle className="size-4 mt-0.5 shrink-0 text-amber-500" />
          DNS changes typically take 5 minutes to 72 hours to propagate. You can continue while it propagates.
        </div>
      </StepCard>

      {/* Step 3: Verify */}
      <StepCard
        n={3}
        title="Verify the domain"
        icon={<CheckCircle2 className="size-5" />}
        checked={done.verify}
        onToggle={() => toggle("verify")}
      >
        <p className="text-sm text-muted-foreground">
          Use a DNS lookup tool to confirm your records are live, then return here and mark this step complete.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`https://dnschecker.org/#TXT/${domain || "yourdomain.com"}`} target="_blank" rel="noreferrer">
              Check SPF <ExternalLink className="ml-1.5 size-3" />
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`https://dnschecker.org/#CNAME/lovable._domainkey.${domain || "yourdomain.com"}`} target="_blank" rel="noreferrer">
              Check DKIM <ExternalLink className="ml-1.5 size-3" />
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`https://mxtoolbox.com/SuperTool.aspx?action=mx%3a${domain || "yourdomain.com"}`} target="_blank" rel="noreferrer">
              MXToolbox <ExternalLink className="ml-1.5 size-3" />
            </a>
          </Button>
        </div>
      </StepCard>

      {/* Step 4: Sender address */}
      <StepCard
        n={4}
        title="Choose a sender address"
        icon={<Mail className="size-5" />}
        checked={done.sender}
        onToggle={() => toggle("sender")}
      >
        <p className="text-sm text-muted-foreground">
          This is the "From" address recipients see. Pick a clear, monitored mailbox.
        </p>
        <div className="flex items-center gap-2 max-w-md">
          <Input value={sender} onChange={(e) => setSender(e.target.value)} className="max-w-[180px]" />
          <span className="text-muted-foreground">@</span>
          <Input value={domain || "yourdomain.com"} readOnly className="bg-muted/50" />
        </div>
        <div className="text-xs text-muted-foreground">
          Preview: <code className="px-1.5 py-0.5 rounded bg-muted">{sender}@{domain || "yourdomain.com"}</code>
        </div>
      </StepCard>

      {/* Step 5: Test send */}
      <StepCard
        n={5}
        title="Send a test email"
        icon={<Send className="size-5" />}
        checked={done.test}
        onToggle={() => toggle("test")}
      >
        <p className="text-sm text-muted-foreground">
          Once the domain is verified, send a test to your own inbox and confirm it arrives, looks branded, and isn't flagged as spam.
        </p>
        <Button
          onClick={() => toast.info("Connect Lovable Emails to enable test send", { description: "Complete steps 1–4 first." })}
        >
          <Send className="size-4 mr-2" /> Send test email
        </Button>
      </StepCard>

      {/* Complete state */}
      {progress === 100 && (
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-5 flex items-start gap-3">
          <CheckCircle2 className="size-6 text-primary mt-0.5" />
          <div>
            <div className="font-semibold">Email is ready</div>
            <div className="text-sm text-muted-foreground">
              Your sender domain is verified. ProjectCore can now send approvals, notifications, and quotes from {sender}@{domain || "yourdomain.com"}.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepCard({
  n, title, icon, checked, onToggle, children,
}: {
  n: number; title: string; icon: React.ReactNode; checked: boolean;
  onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border bg-card p-5 transition-all ${checked ? "border-primary/40 bg-primary/[0.02]" : ""}`}>
      <div className="flex items-start gap-4">
        <button
          onClick={onToggle}
          className="mt-0.5 shrink-0 transition-transform hover:scale-110"
          aria-label={checked ? "Mark step incomplete" : "Mark step complete"}
        >
          {checked ? <CheckCircle2 className="size-6 text-primary" /> : <Circle className="size-6 text-muted-foreground" />}
        </button>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Step {n}</span>
            <span className="text-muted-foreground">{icon}</span>
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
