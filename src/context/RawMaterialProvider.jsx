import { useState, useRef, useCallback, useMemo } from "react";
import { RawMaterialContext } from "./rawMaterialContext";

// Seed rows so the lists aren't empty on first load (local-state demo data —
// swap this for a GET once the backend endpoint exists).
const SEED_SHEETS = [
  {
    id: 1,
    supplier: "Test",
    date: "2026-05-08",
    size: "10",
    point: "120p",
    grade: "M5",
    quantity: "98",
  },
  {
    id: 2,
    supplier: "Tarun",
    date: "2026-06-24",
    size: "100",
    point: "120P",
    grade: "M3",
    quantity: "0",
  },
  {
    id: 3,
    supplier: "Tarun 1",
    date: "2026-06-26",
    size: "1000",
    point: "10",
    grade: "A",
    quantity: "100",
  },
];

/**
 * RawMaterialProvider
 * Holds the raw-material sheets and the CRUD operations over them. This is the
 * single place to swap to a real API later — pages call the hook, not the API.
 */
export function RawMaterialProvider({ children }) {
  const [sheets, setSheets] = useState(SEED_SHEETS);
  // Monotonic id counter, independent of array length.
  const idRef = useRef(
    SEED_SHEETS.reduce((max, s) => Math.max(max, s.id), 0) + 1,
  );

  const addSheet = useCallback((data) => {
    const id = idRef.current++;
    setSheets((prev) => [...prev, { id, ...data }]);
    return id;
  }, []);

  const updateSheet = useCallback((id, data) => {
    setSheets((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
  }, []);

  const deleteSheet = useCallback((id) => {
    setSheets((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const value = useMemo(
    () => ({ sheets, addSheet, updateSheet, deleteSheet }),
    [sheets, addSheet, updateSheet, deleteSheet],
  );

  return (
    <RawMaterialContext.Provider value={value}>
      {children}
    </RawMaterialContext.Provider>
  );
}
