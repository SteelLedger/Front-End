import { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { X, KeyRound, Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { passwordRules, validateNewPassword } from "../utils/password";
import { changePassword } from "../services/apiServices";

const emptyForm = () => ({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  error: "",
  errorFields: [],
});

/** Password input with a show/hide toggle. */
function PasswordField({
  label,
  value,
  onChange,
  invalid,
  autoComplete,
  inputRef,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
        {label}
        <span className="text-rose-500">*</span>
      </span>
      <div className="relative">
        <input
          ref={inputRef}
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-md border py-2.5 pl-3 pr-10 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
            invalid
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-300"
              : "border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -mr-2 -translate-y-1/2 p-2 text-slate-400 transition-colors hover:text-slate-600"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

/** Live requirement line — ticks green once the rule passes. */
function Rule({ met, children }) {
  return (
    <li
      className={`flex items-center gap-2 text-xs ${
        met ? "text-emerald-600" : "text-slate-400"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          met ? "bg-emerald-100" : "bg-slate-100"
        }`}
      >
        {met && <Check size={11} strokeWidth={3} />}
      </span>
      {children}
    </li>
  );
}

/**
 * ChangePasswordModal
 * The change-password form, reachable from Settings and from the sidebar user
 * menu. The session is deliberately kept after a successful change — if the
 * backend ever starts revoking the token, the 401 interceptor catches it on
 * the next request.
 */
export default function ChangePasswordModal({ open, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const currentRef = useRef(null);

  // Open on a clean form, focused, with the page behind it frozen.
  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setSaving(false);
    const focusId = setTimeout(() => currentRef.current?.focus(), 50);
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(focusId);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const update = (field, value) =>
    setForm((f) => ({ ...f, [field]: value, error: "", errorFields: [] }));

  // Same rules the reset flow uses, plus the current password this form has.
  const rules = passwordRules({
    newPassword: form.newPassword,
    confirmPassword: form.confirmPassword,
    currentPassword: form.currentPassword,
  });

  const fail = (error, ...errorFields) => {
    setForm((f) => ({ ...f, error, errorFields }));
    return false;
  };

  function validate() {
    if (!form.currentPassword)
      return fail("Enter your current password.", "currentPassword");
    const problem = validateNewPassword({
      newPassword: form.newPassword,
      confirmPassword: form.confirmPassword,
      currentPassword: form.currentPassword,
    });
    if (problem) return fail(problem.message, problem.field);
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm(emptyForm());
      toast.success("Password changed");
      onClose();
    } catch (err) {
      // 400 covers "current password is wrong" and "same as the old one" —
      // the API's wording is more precise than anything generic here.
      const message =
        err?.response?.data?.message || "Couldn't change your password";
      setForm((f) => ({
        ...f,
        error: message,
        errorFields: err?.response?.status === 400 ? ["currentPassword"] : [],
      }));
      currentRef.current?.focus();
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const errs = form.errorFields;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={saving ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Change password"
        className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1E4D96]">
              <KeyRound size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900">
                Change password
              </h3>
              <p className="truncate text-xs text-slate-400">
                Use a password you don't reuse anywhere else.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="-m-2 rounded-md p-2 text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {form.error && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                {form.error}
              </p>
            )}

            <PasswordField
              label="Current Password"
              value={form.currentPassword}
              onChange={(v) => update("currentPassword", v)}
              invalid={errs.includes("currentPassword")}
              autoComplete="current-password"
              inputRef={currentRef}
            />

            <PasswordField
              label="New Password"
              value={form.newPassword}
              onChange={(v) => update("newPassword", v)}
              invalid={errs.includes("newPassword")}
              autoComplete="new-password"
            />

            <PasswordField
              label="Confirm New Password"
              value={form.confirmPassword}
              onChange={(v) => update("confirmPassword", v)}
              invalid={errs.includes("confirmPassword")}
              autoComplete="new-password"
            />

            <ul className="space-y-1.5 rounded-lg bg-slate-50 px-3 py-2.5">
              {rules.map((r) => (
                <Rule key={r.key} met={r.met}>
                  {r.label}
                </Rule>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1E4D96] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3F7A] disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} strokeWidth={2.5} />
              )}
              {saving ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
