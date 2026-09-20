import { Loader2 } from "lucide-react";

/**
 * GateScreen
 * The full-page frame the pre-app gates render into, so the maintenance check
 * and the organization load look like one continuous load rather than two
 * different spinners flashing in sequence.
 */
export default function GateScreen({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FB] p-6">
      <div className="w-full max-w-sm text-center">{children}</div>
    </div>
  );
}

/** The shared "still checking" state. */
export function GateLoading({ label }) {
  return (
    <GateScreen>
      <Loader2
        size={28}
        className="mx-auto animate-spin text-[#1E4D96]"
        aria-hidden="true"
      />
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
    </GateScreen>
  );
}
