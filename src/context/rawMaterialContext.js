import { createContext, useContext } from "react";

// Shared store for raw-material (Patta) sheets — consumed by the Purchase page
// (which adds/edits sheets) and the Inventory page (which reads aggregated
// stock). Kept in a non-component module so the Provider file can export only a
// component (keeps react-refresh happy).
export const RawMaterialContext = createContext(null);

export function useRawMaterials() {
  const ctx = useContext(RawMaterialContext);
  if (!ctx) {
    throw new Error("useRawMaterials must be used within a RawMaterialProvider");
  }
  return ctx;
}
