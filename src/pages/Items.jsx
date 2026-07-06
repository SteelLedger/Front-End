import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2, Package, Inbox } from "lucide-react";
import ItemDrawer from "../components/ItemDrawer";
import ConfirmDialog from "../components/ConfirmDialog";
import { GetRawMaterials } from "../services/apiServices";

function emptyByproduct() {
  return { name: "", qty: "" };
}

function emptyForm() {
  return {
    sheetId: "",
    sheetQty: "",
    productSize: "",
    productCount: "",
    productQty: "",
    byproducts: [emptyByproduct()],
    error: "",
    errorFields: [],
  };
}

export default function Items() {
  const [sheets, setSheets] = useState([]);
  const [products, setProducts] = useState([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState("add"); // "add" | "edit"
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [confirmState, setConfirmState] = useState(null);

  // Load available sheets (raw-material inventory) for the dropdown.
  useEffect(() => {
    let alive = true;
    GetRawMaterials({ page: 1, limit: 100 })
      .then((res) => {
        const d = res?.data?.data ?? {};
        const list = Array.isArray(d) ? d : (d.rawMaterials ?? []);
        if (alive) {
          setSheets(
            list
              .map((s) => ({
                id: s._id ?? s.id,
                name:
                  s.rawMaterialName ||
                  [s.size, s.point, s.grade].filter(Boolean).join(" "),
              }))
              .filter((s) => s.id && s.name),
          );
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function openAdd() {
    setMode("add");
    setEditingId(null);
    setForm(emptyForm());
    setDrawerOpen(true);
  }

  function openEdit(p) {
    setMode("edit");
    setEditingId(p.id);
    setForm({
      sheetId: p.sheetId,
      sheetQty: p.sheetQty,
      productSize: p.productSize,
      productCount: p.productCount,
      productQty: p.productQty,
      byproducts: p.byproducts.length
        ? p.byproducts.map((b) => ({ ...b }))
        : [emptyByproduct()],
      error: "",
      errorFields: [],
    });
    setDrawerOpen(true);
  }

  // Called by the drawer once validation passes.
  function handleSave() {
    const sheet = sheets.find((s) => s.id === form.sheetId);
    const byproducts = form.byproducts
      .filter((b) => b.name.trim() || String(b.qty).trim())
      .map((b) => ({ name: b.name.trim(), qty: b.qty }));
    const data = {
      sheetId: form.sheetId,
      sheetName: sheet?.name || "—",
      sheetQty: form.sheetQty,
      productSize: form.productSize,
      productCount: form.productCount,
      productQty: form.productQty,
      byproducts,
    };
    if (mode === "add") {
      setProducts((prev) => [{ id: Date.now(), ...data }, ...prev]);
      toast.success("Product added");
    } else {
      setProducts((prev) =>
        prev.map((x) => (x.id === editingId ? { ...x, ...data } : x)),
      );
      toast.success("Product updated");
    }
    setDrawerOpen(false);
  }

  function requestDelete(p) {
    setConfirmState({
      title: "Delete product?",
      message: `Delete this cut from "${p.sheetName}"? This can't be undone.`,
      confirmLabel: "Yes, delete",
      onConfirm: () => setProducts((prev) => prev.filter((x) => x.id !== p.id)),
    });
  }

  return (
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5 space-y-4 lg:space-y-5">
      <div className="max-w-[1400px] mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Items
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Cut products from a raw material sheet and record any byproducts.
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1E4D96] hover:bg-[#1A3F7A] active:bg-[#15356A] text-white font-medium text-sm px-5 py-2.5 shadow-sm shadow-blue-200 transition-colors w-full sm:w-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1E4D96]/50"
          >
            <Plus size={18} strokeWidth={2.5} />
            Cut Product
          </button>
        </div>

        {/* Products list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Products</h2>
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 text-slate-400">
              <Inbox size={32} className="mb-2" />
              <p className="text-sm">
                No products yet. Click{" "}
                <span className="font-medium text-slate-500">Add Product</span>{" "}
                to cut your first one from a sheet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm table-fixed">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                    <th className="py-3 px-4 font-semibold">Sheet</th>
                    <th className="py-3 px-4 font-semibold">Sheet Qty</th>
                    <th className="py-3 px-4 font-semibold">Product Size</th>
                    <th className="py-3 px-4 font-semibold">Products</th>
                    <th className="py-3 px-4 font-semibold">Product Qty</th>
                    <th className="py-3 px-4 font-semibold">Byproducts</th>
                    <th className="py-3 px-4 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 align-top">
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {p.sheetName}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.sheetQty}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {p.productSize}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {p.productCount}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {Number(p.productQty || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4">
                        {p.byproducts.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {p.byproducts.map((b, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                              >
                                <Package size={11} className="text-slate-400" />
                                {b.name}
                                {b.qty !== "" && b.qty != null
                                  ? ` · ${b.qty}`
                                  : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            aria-label="Edit product"
                            title="Edit"
                            className="p-1.5 rounded-md text-slate-400 hover:text-[#1E4D96] hover:bg-blue-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDelete(p)}
                            aria-label="Delete product"
                            title="Delete"
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ItemDrawer
        open={drawerOpen}
        mode={mode}
        formState={form}
        setFormState={setForm}
        sheets={sheets}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          const fn = confirmState?.onConfirm;
          setConfirmState(null);
          fn?.();
        }}
      />
    </div>
  );
}
