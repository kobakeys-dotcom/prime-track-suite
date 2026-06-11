import { RfiRegister } from "@/components/rfi-register";
import { SubmittalRegister } from "@/components/submittal-register";
import { BoqRegister } from "@/components/boq-register";
import { VariationRegister } from "@/components/variation-register";
import { PaymentClaimRegister } from "@/components/payment-claim-register";
import { BudgetVsActual } from "@/components/budget-vs-actual";
import { MaterialRequestRegister } from "@/components/material-request-register";
import { DocumentManager } from "@/components/document-manager";

export function ProjectMaterialRequestsPanel({ projectId }: { projectId: string }) {
  return <MaterialRequestRegister projectId={projectId} variant="compact" />;
}

export function ProjectBudgetPanel({ projectId }: { projectId: string }) {
  return <BudgetVsActual projectId={projectId} variant="compact" />;
}

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
  return <DocumentManager projectId={projectId} />;
}

