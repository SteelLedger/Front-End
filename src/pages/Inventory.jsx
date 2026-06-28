import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, X, Layers, Boxes, Package, Inbox } from "lucide-react";
import { useRawMaterials } from "../context/rawMaterialContext";

function StatCard({ icon: Icon, iconBg, iconColor, label, value }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
      <span
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-lg font-semibold truncate text-slate-900">{value}</p>
      </div>
    </div>
  );
}

const dash = (v) => (v && String(v).trim() ? v : "—");

export default function Inventory() {
  const { sheets } = useRawMaterials();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  // Aggregate sheets into stock-per-spec: group by size + point + grade
  // (case-insensitive) and sum the quantities.
  const groups = useMemo(() => {
    const map = new Map();
    for (const s of sheets) {
      const size = (s.size || "").trim();
      const point = (s.point || "").trim();
      const grade = (s.grade || "").trim();
      const key = `${size.toLowerCase()}|${point.toLowerCase()}|${grade.toLowerCase()}`;
      const qty = Number(s.quantity) || 0;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += qty;
        existing.sheets += 1;
      } else {
        map.set(key, { key, size, point, grade, quantity: qty, sheets: 1 });
      }
    }
    return [...map.values()].sort(
      (a, b) =>
        a.size.localeCompare(b.size, undefined, { numeric: true }) ||
        a.point.localeCompare(b.point, undefined, { numeric: true }) ||
        a.grade.localeCompare(b.grade),
    );
  }, [sheets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      [g.size, g.point, g.grade]
        .map((v) => String(v ?? "").toLowerCase())
        .some((v) => v.includes(q)),
    );
  }, [groups, query]);

  const totalQuantity = useMemo(
    () => groups.reduce((sum, g) => sum + g.quantity, 0),
    [groups],
  );

  return (
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5 space-y-4 lg:space-y-5">
      <div className="max-w-[1400px] mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Inventory Raw Material
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Current raw material (Patta) stock on hand, grouped by size, point
              and grade. Sheets are added from the Purchase tab.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/purchase")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1E4D96] hover:bg-[#1A3F7A] active:bg-[#15356A] text-white font-medium text-sm px-5 py-2.5 shadow-sm shadow-blue-200 transition-colors w-full sm:w-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1E4D96]/50"
          >
            <Plus size={18} strokeWidth={2.5} />
            Add Raw Material
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <StatCard
            icon={Layers}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            label="Distinct Specs"
            value={String(groups.length)}
          />
          <StatCard
            icon={Package}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            label="Total Sheets"
            value={String(sheets.length)}
          />
          <StatCard
            icon={Boxes}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            label="Total Quantity"
            value={totalQuantity.toLocaleString("en-IN")}
          />
        </div>

        {/* Stock panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Stock by Specification
            </h2>
            <div className="relative w-full sm:w-72">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search size, point, grade"
                className="w-full pl-9 pr-8 py-2.5 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E4D96]/30 focus:border-[#1E4D96] transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 text-slate-400">
              <Inbox size={32} className="mb-2" />
              <p className="text-sm">
                {sheets.length === 0
                  ? "No stock yet. Add raw material from the Purchase tab."
                  : "No stock matches your search."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                    <th className="py-3 px-4 font-semibold">Size</th>
                    <th className="py-3 px-4 font-semibold">Point</th>
                    <th className="py-3 px-4 font-semibold">Grade</th>
                    <th className="py-3 px-4 font-semibold text-right">
                      Sheets
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">
                      Total Qty
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((g) => (
                    <tr key={g.key} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {dash(g.size)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {dash(g.point)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {dash(g.grade)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {g.sheets}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {g.quantity.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                            g.quantity > 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {g.quantity > 0 ? "In stock" : "Out of stock"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
