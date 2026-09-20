import { createContext, useContext } from "react";

/**
 * The organization every tenant API call is scoped to, plus the list the user
 * can switch between. Provided by components/OrganizationProvider, which
 * resolves one before any page renders — see utils/organization for why the
 * app can't load a single screen without it.
 */
export const OrganizationContext = createContext({
  organizations: [],
  activeOrg: null,
  activeOrgId: "",
  switchOrg: () => {},
  refresh: () => {},
});

/** Read the active organization and switch tenants. */
export function useOrganization() {
  return useContext(OrganizationContext);
}
