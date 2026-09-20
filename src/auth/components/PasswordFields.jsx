import { useState } from "react";
import { AUTH_INPUT_CLASS } from "../../utils/authStyles";

/**
 * The password input and rule-tick used by the signed-out screens that set a
 * password — the reset step of the forgot-password flow and the first-login
 * screen. Both wear `AUTH_INPUT_CLASS`, which is what separates them from
 * ChangePasswordModal's own fields (those are styled for a modal, not the
 * auth shell).
 */
export function PasswordField({
  label,
  id,
  value,
  onChange,
  autoComplete,
  inputRef,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="mb-5">
      <label
        htmlFor={id}
        className="mb-1.5 block text-[13px] font-semibold text-[#0D2140]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          placeholder="••••••••"
          onChange={(e) => onChange(e.target.value)}
          className={AUTH_INPUT_CLASS}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3.5 top-1/2 -mr-2 -translate-y-1/2 p-2 text-slate-400"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z"
              stroke="#9CA3AF"
              strokeWidth="1.3"
            />
            <circle cx="8" cy="8" r="1.8" stroke="#9CA3AF" strokeWidth="1.3" />
            {visible && (
              <path
                d="M3 3l10 10"
                stroke="#9CA3AF"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}

/** One live requirement line — ticks green once the rule passes. */
export function Rule({ met, children }) {
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
        {met && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6.5l2.5 2.5 4.5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      {children}
    </li>
  );
}
