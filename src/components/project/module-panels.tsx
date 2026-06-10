import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listDocuments } from "@/lib/documents.functions";
import { RfiRegister } from "@/components/rfi-register";
import { SubmittalRegister } from "@/components/submittal-register";
import { BoqRegister } from "@/components/boq-register";
import { VariationRegister } from "@/components/variation-register";
import { PaymentClaimRegister } from "@/components/payment-claim-register";

export function ProjectRfisPanel({ projectId }: { projectId: string }) {
  return <RfiRegister projectId={projectId} variant="compact" />;
}

export function ProjectSubmittalsPanel({ projectId }: { projectId: string }) {
  return <SubmittalRegister projectId={projectId} variant="compact" />;
}

export function ProjectBoqPanel({ projectId }: { projectId: string }) {
  return <BoqRegister projectId={projectId} variant="full" />;
}

export function ProjectVariationsPanel({ projectId }: { projectId: string }) {
  return <VariationRegister projectId={projectId} variant="compact" />;
}

export function ProjectPaymentClaimsPanel({ projectId }: { projectId: string }) {
  return <PaymentClaimRegister projectId={projectId} variant="compact" />;
}


export function ProjectDocumentsPanel({ projectId }: { projectId: string }) {
  const fetcher = useServerFn(listDocuments);
  const { data: rows = [] } = useQuery({ queryKey: ["documents", projectId], queryFn: () => fetcher({ data: { projectId } }) });

  if (rows.length === 0) {
    return <div className="bg-card border border-border rounded-sm p-10 text-center text-sm text-muted-foreground">No documents linked to this project yet</div>;
  }

  return (
    <div className="bg-card border border-border rounded-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3">Name</th>
            <th className="text-left px-4 py-3">Category</th>
            <th className="text-left px-4 py-3">Expires</th>
            <th className="text-left px-4 py-3">Uploaded</th>
          </tr>
        </thead>
        <tbody>
          {(rows as any[]).map((r) => {
            const expiring = r.expires_at && new Date(r.expires_at).getTime() < Date.now() + 30 * 86400000;
            return (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-xs">{r.category ?? "—"}</td>
                <td className={`px-4 py-3 text-xs ${expiring ? "text-rose-600 font-semibold" : ""}`}>{r.expires_at ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
