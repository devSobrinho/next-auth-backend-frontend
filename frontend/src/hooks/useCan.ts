import { useContext } from "react"
import { AuthContext } from "../context/AuthContext"
import { validadeUserPermission } from "../utils/validadeUserPermission";

type UseCanParams = {
  permissions?: string[];
  roles?: string[];
}

export function useCan({
  permissions,
  roles,
}: UseCanParams) {
  const {
    isAuthenticated,
    user,
  } = useContext(AuthContext);

  if (!isAuthenticated) {
    return false;
  }

  const userHasValidPermissions = validadeUserPermission({
    user,
    permissions,
    roles,
  });

  return userHasValidPermissions;
}