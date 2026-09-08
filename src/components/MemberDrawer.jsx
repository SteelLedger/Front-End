import { useEffect, useRef } from "react";
import { X, Check, Mail, ShieldCheck, Send } from "lucide-react";
import { ROLES, isValidEmail } from "../utils/members";

/**
 * MemberDrawer
 * Right-side slide-in panel for inviting a team member or editing one.
 * The API takes exactly two fields — email and role — and mails a generated
 * temporary password on invite, so there's no password field here.
 *
 * Form state lives in the parent (`formState` / `setFormState`).
 * `lockRole` covers the one rule the API enforces on edit: you can't change
 * your own role.
 */
export default function MemberDrawer({
  open,
  mode = "add",
  formState,
  setFormState,
  saving,
  lockRole = false,
  onClose,
  onSubmit,
}) {
  const emailRef = useRef(null);
  const isAdd = mode === "add";

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => emailRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Close on Escape + lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const update = (field, value) =>
    setFormState((f) => ({ ...f, [field]: value, error: "", errorFields: [] }));

  function handleSubmit(e) {
    e.preventDefault();
    const email = formState.email.trim();

    if (!email) {
      setFormState((f) => ({
        ...f,
        error: "Enter an email address.",
        errorFields: ["email"],
      }));
      emailRef.current?.focus();
      return;
    }
    if (!isValidEmail(email)) {
      setFormState((f) => ({
        ...f,
        error: "That doesn't look like a valid email address.",
        errorFields: ["email"],
      }));
      emailRef.current?.focus();
      return;
    }
    if (!formState.role) {
      setFormState((f) => ({
        ...f,
        error: "Pick a role.",
        errorFields: ["role"],
      }));
      return;
    }

    setFormState((f) => ({ ...f, error: "", errorFields: [] }));
    onSubmit(e);
  }

  const errs = formState.errorFields || [];

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isAdd ? "Add new member" : "Edit member"}
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isAdd ? "Add New Member" : "Edit Member"}
            </h3>
            <p className="text-xs text-slate-400">
              {isAdd
                ? "They'll get an email with a temporary password"
                : "Change their email address or role"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-2 rounded-md p-2 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <form
          id="member-form"
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 overflow-y-auto px-6 py-5"
        >
          {formState.error && (
            <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {formState.error}
            </p>
          )}

          <div className="space-y-5">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
                Email Address<span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  ref={emailRef}
                  type="email"
                  autoComplete="off"
                  value={formState.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="name@company.com"
                  className={`w-full rounded-md border py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errs.includes("email")
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-300"
                      : "border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30"
                  }`}
                />
              </div>
            </label>

            <div>
              <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
                Role<span className="text-rose-500">*</span>
              </span>
              <div className="space-y-2">
                {ROLES.map((r) => {
                  const selected = formState.role === r.value;
                  return (
                    <label
                      key={r.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        lockRole
                          ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
                          : selected
                            ? "border-[#1E4D96] bg-[#F4F7FD]"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="member-role"
                        value={r.value}
                        checked={selected}
                        disabled={lockRole}
                        onChange={() => update("role", r.value)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#1E4D96]"
                      />
                      <span className="min-w-0">
                        <span
                          className={`block text-sm font-semibold ${
                            selected ? "text-[#1E4D96]" : "text-slate-700"
                          }`}
                        >
                          {r.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                          {r.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {lockRole && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-400">
                  <ShieldCheck size={13} className="mt-0.5 shrink-0" />
                  You can't change your own role — ask another admin to do it.
                </p>
              )}
            </div>

            {isAdd && (
              <p className="flex items-start gap-2 rounded-lg bg-blue-50/70 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                <Send size={13} className="mt-0.5 shrink-0 text-[#1E4D96]" />
                We'll email a temporary password to this address. The invite
                stays <span className="font-semibold">Pending</span> until they
                sign in with it.
              </p>
            )}
          </div>
        </form>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="member-form"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-[#1E4D96] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3F7A] disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
          >
            {isAdd ? (
              <Send size={16} strokeWidth={2.5} />
            ) : (
              <Check size={16} strokeWidth={2.5} />
            )}
            {saving
              ? isAdd
                ? "Sending…"
                : "Updating…"
              : isAdd
                ? "Send Invite"
                : "Update Member"}
          </button>
        </div>
      </div>
    </div>
  );
}
