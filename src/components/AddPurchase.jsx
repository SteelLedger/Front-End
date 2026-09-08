import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import RawMaterialDrawer from "./RawMaterialDrawer";
import AddPartyDrawer from "./AddPartyDrawer";
import { emptyPartyForm, buildPartyPayload } from "../utils/party";
import { emptyPurchaseForm, buildPurchasePayload } from "../utils/purchase";
import {
  GetParties,
  createParty,
  createPurchase,
} from "../services/apiServices";

/**
 * AddPurchase
 * Self-contained "add raw material (purchase)" flow: the RawMaterialDrawer plus
 * the stacked Add-Supplier party drawer. Controlled via `open`; calls
 * `onCreated` after a successful create so the parent can refresh.
 */
export default function AddPurchase({ open, onClose, onCreated }) {
  const [form, setForm] = useState(emptyPurchaseForm);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  const [partyOpen, setPartyOpen] = useState(false);
  const [partyForm, setPartyForm] = useState(emptyPartyForm);
  const [partySaving, setPartySaving] = useState(false);

  // Reset the form each time the drawer opens.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setForm(emptyPurchaseForm()));
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Load all parties once for the supplier dropdown (limit caps at 100).
  useEffect(() => {
    let alive = true;
    const partiesOf = (res) => {
      const d = res?.data?.data ?? res?.data ?? [];
      return Array.isArray(d) ? d : (d.parties ?? []);
    };
    async function loadSuppliers() {
      try {
        // Only suppliers belong in a purchase's supplier picker.
        const first = await GetParties({
          filter: ["supplier"],
          page: 1,
          limit: 100,
        });
        const all = [...partiesOf(first)];
        const pages = Math.min(
          first?.data?.meta?.pagination?.totalPages ?? 1,
          20,
        );
        if (pages > 1) {
          const rest = await Promise.all(
            Array.from({ length: pages - 1 }, (_, i) =>
              GetParties({ filter: ["supplier"], page: i + 2, limit: 100 })
                .then(partiesOf)
                .catch(() => []),
            ),
          );
          rest.forEach((arr) => all.push(...arr));
        }
        if (alive) {
          setSuppliers(
            all
              .map((p) => ({ id: p._id ?? p.id, name: p.name || "" }))
              .filter((s) => s.id && s.name),
          );
        }
      } catch {
        if (alive) toast.error("Couldn't load suppliers");
      }
    }
    loadSuppliers();
    return () => {
      alive = false;
    };
  }, []);

  function openAddSupplier() {
    // Anything added from here is a supplier by definition.
    setPartyForm({ ...emptyPartyForm("supplier"), name: form.supplier.trim() });
    setPartyOpen(true);
  }

  async function handleSaveSupplier(e) {
    e.preventDefault();
    const name = partyForm.name.trim();
    if (!name) return;
    setPartySaving(true);
    try {
      const res = await createParty(buildPartyPayload(partyForm));
      const created = res?.data?.data ?? {};
      const newId = created._id ?? created.id ?? "";
      setSuppliers((prev) => [{ id: newId, name }, ...prev]);
      setForm((f) => ({
        ...f,
        supplier: name,
        partyId: newId,
        error: "",
        errorFields: [],
      }));
      toast.success("Supplier added");
      setPartyOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't add supplier");
    } finally {
      setPartySaving(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.partyId) return; // drawer surfaces the field errors
    setSaving(true);
    try {
      await createPurchase(buildPurchasePayload(form));
      toast.success("Raw material added");
      onCreated?.();
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't add raw material");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <RawMaterialDrawer
        open={open}
        mode="add"
        formState={form}
        setFormState={setForm}
        saving={saving}
        supplierOptions={suppliers}
        closeOnEscape={!partyOpen}
        onAddSupplier={openAddSupplier}
        onClose={onClose}
        onSubmit={handleSave}
      />

      <AddPartyDrawer
        open={partyOpen}
        mode="add"
        formState={partyForm}
        setFormState={setPartyForm}
        saving={partySaving}
        loading={false}
        lockPartyType
        onClose={() => setPartyOpen(false)}
        onSubmit={handleSaveSupplier}
      />
    </>
  );
}
