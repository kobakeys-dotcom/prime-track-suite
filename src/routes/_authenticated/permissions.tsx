import { createFileRoute } from "@tanstack/react-router";
import { Shield, Check, Minus } from "lucide-react";
import { ROLE_LIST, MODULE_LIST, getMatrix } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/permissions")({
  head: () => ({ meta: [{ title: "Role Permissions — ProjectCore" }] }),
  component: PermissionsPage,
});

function PermissionsPage() {
  const matrix = getMatrix();
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Shield className="size-6 text-accent" /> Role Permissions</h1>
        <p className="text-sm text-muted-foreground mt-1">Default capability matrix for each role. Assign roles in Settings → Team. Row-level security in the database enforces these rules.</p>
      </div>
      <div className="bg-card border border-border rounded-sm overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground sticky top-0">
            <tr>
              <th className="text-left p-2 sticky left-0 bg-muted/40">Module</th>
              {ROLE_LIST.map((r) => <th key={r} className="text-center p-2 whitespace-nowrap">{r.replace(/_/g, " ")}</th>)}
            </tr>
          </thead>
          <tbody>
            {MODULE_LIST.map((m) => (
              <tr key={m} className="border-t border-border">
                <td className="p-2 font-medium sticky left-0 bg-card">{m.replace(/_/g, " ")}</td>
                {ROLE_LIST.map((r) => {
                  const acts = (matrix[r] as any)?.[m] ?? [];
                  return (
                    <td key={r} className="p-2 text-center">
                      {acts.length === 0 ? <Minus className="size-3 inline text-muted-foreground/40" /> : (
                        <span className="text-[9px] font-mono text-accent">{acts.map((a: string) => a[0].toUpperCase()).join("")}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Legend: V=view · C=create · E=edit · D=delete · A=approve. <Check className="size-3 inline text-emerald-500" /> Server-side RLS scopes all data to your company and project membership.</p>
    </div>
  );
}
