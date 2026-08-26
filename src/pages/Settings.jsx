import { useState, useRef } from "react";
import { toast } from "react-toastify";
import {
  KeyRound,
  Eye,
  EyeOff,
  Check,
  Loader2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { getCurrentUser, getDisplayUser } from "../utils/auth";
import { roleLabel } from "../utils/members";
import { passwordRules, validateNewPassword } from "../utils/password";
import { changePassword } from "../services/apiServices";

const emptyForm = () => ({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  error: "",
  errorFields: [],
});

/* -------------------------------- pieces ---------------------------------- */

function Card({ icon: Icon, title, description, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1E4D96]">
          <Icon size={19} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/** Password input with a show/hide toggle. */
function PasswordField({
  label,
  value,
  onChange,
  invalid,
  autoComplete,
  inputRef,
  hint,
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
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
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

/* ---------------------------------- page ---------------------------------- */

export default function Settings() {
  const me = getCurrentUser();
  const display = getDisplayUser();

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const currentRef = useRef(null);
  const newRef = useRef(null);

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
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5">
      <div className="mx-auto max-w-2xl">
        <div className="space-y-4 pb-4 lg:space-y-5">
          {/* Account */}
          <Card
            icon={UserRound}
            title="Account"
            description="How you're signed in. Only an admin can change these."
          >
            <dl className="divide-y divide-slate-100 border-t border-slate-100">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-slate-500">Email</dt>
                <dd className="truncate text-sm font-medium text-slate-800">
                  {me.email || display.email || "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-slate-500">Role</dt>
                <dd>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      me.role === "admin"
                        ? "bg-[#EEF3FB] text-[#1E4D96]"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {me.role === "admin" && <ShieldCheck size={12} />}
                    {roleLabel(me.role)}
                  </span>
                </dd>
              </div>
            </dl>
          </Card>

          {/* Password */}
          <Card
            icon={KeyRound}
            title="Change password"
            description="Use a password you don't reuse anywhere else."
          >
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
                inputRef={newRef}
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

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1E4D96] px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition-colors hover:bg-[#1A3F7A] disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
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
          </Card>
        </div>
      </div>
    </div>
  );
}
