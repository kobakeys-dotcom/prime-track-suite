import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useMyPermissions } from "@/hooks/use-permissions";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function PermissionGate({
  permission,
  anyOf,
  allOf,
  fallback = null,
  disabled,
  children,
}: {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  fallback?: ReactNode;
  disabled?: boolean;
  children: ReactNode;
}) {
  const { hasPermission, hasAny, hasAll, isLoading } = useMyPermissions();
  if (isLoading) return null;
  let allowed = true;
  if (permission) allowed = hasPermission(permission);
  if (anyOf) allowed = allowed && hasAny(anyOf);
  if (allOf) allowed = allowed && hasAll(allOf);
  if (!allowed) {
    if (disabled) return <span className="opacity-40 pointer-events-none">{children}</span>;
    return <>{fallback}</>;
  }
  return <>{children}</>;
}

export function RequirePermission({ permission, module: mod, children }: { permission: string; module?: string; children: ReactNode }) {
  const { hasPermission, isLoading } = useMyPermissions();
  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading permissions…</div>;
  if (!hasPermission(permission)) return <AccessDenied permission={permission} module={mod} />;
  return <>{children}</>;
}

export function AccessDenied({ permission, module: mod }: { permission?: string; module?: string }) {
  return (
    <div className="p-12 max-w-lg mx-auto text-center">
      <div className="size-14 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
        <Lock className="size-6 text-muted-foreground" />
      </div>
      <h2 className="font-display text-xl font-bold">Access denied</h2>
      <p className="text-sm text-muted-foreground mt-2">You do not have permission to access this page or perform this action.</p>
      {(mod || permission) && (
        <p className="text-xs text-muted-foreground mt-3">
          {mod && <span>Module: <code className="font-mono">{mod}</code></span>}
          {permission && <span className="ml-2">Required: <code className="font-mono">{permission}</code></span>}
        </p>
      )}
      <div className="mt-6 flex items-center justify-center gap-2">
        <Button asChild variant="outline" size="sm"><Link to="/dashboard">Back to dashboard</Link></Button>
        <Button size="sm" onClick={() => toast.info("Request sent to your company admin (placeholder).")}>Request access</Button>
      </div>
    </div>
  );
}
