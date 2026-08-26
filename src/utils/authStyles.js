// Styling shared by the signed-out screens (login, password reset).
//
// It lives outside the component files on purpose: a module that exports both
// components and plain values trips eslint's `react-refresh/only-export-components`.

/** Keeps every text field on the auth screens identical. */
export const AUTH_INPUT_CLASS =
  "w-full rounded-[10px] border-[1.5px] border-slate-200 bg-[#FAFAFA] pl-4 pr-10 py-2.5 " +
  "text-sm text-[#0A1628] transition placeholder:text-[#C0C0C0] focus:border-[#2563C4] " +
  "focus:bg-white focus:ring-4 focus:ring-[#D6E4FA] focus:outline-none";

/** The small blue text link ("Back to sign in", "Forgot password?"). */
export const AUTH_LINK_CLASS =
  "text-[13px] font-medium text-[#2563C4] no-underline hover:underline";
