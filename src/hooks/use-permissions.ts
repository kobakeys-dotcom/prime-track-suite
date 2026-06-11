import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyEffectivePermissions } from "@/lib/permissions.functions";
import { can, MATRIX, type AppRole, type Action, type Module } from "@/lib/permissions";

export type PermissionData = { roles: string[]; companyId: string | null; overrides: Record<string, boolean> };

export function useMyPermissions() {
  const fn = useServerFn(getMyEffectivePermissions);
  const q = useQuery({
    queryKey: ["my-permissions"],
    queryFn: () => fn() as Promise<PermissionData>,
    staleTime: 60_000,
  });
  const data: PermissionData = q.data ?? { roles: [], companyId: null, overrides: {} };

  function hasPermission(key: string): boolean {
    // Override wins (allow or explicit deny)
    if (key in data.overrides) return data.overrides[key];
    // Otherwise check static MATRIX
    const [mod, action] = key.split(".");
    if (!mod || !action) return false;
    return can(data.roles, action as Action, mod as Module);
  }
  function hasAny(keys: string[]) { return keys.some(hasPermission); }
  function hasAll(keys: string[]) { return keys.every(hasPermission); }
  function canAccessModule(mod: Module) { return hasPermission(`${mod}.view`); }
  function isCompanyAdmin() { return data.roles.includes("company_admin"); }
  function isClient() { return data.roles.includes("client_representative"); }

  return { ...data, isLoading: q.isLoading, hasPermission, hasAny, hasAll, canAccessModule, isCompanyAdmin, isClient };
}

export { MATRIX, type AppRole };
