/**
 * ComingSoon
 * Lightweight placeholder for modules that aren't built yet, so navigating to
 * them shows something intentional instead of a blank screen during QA.
 */
export default function ComingSoon({ title = "This page" }) {
  return (
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5 flex items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#1E4D96]">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          This module is coming soon — it's part of the next build phase. Hang
          tight!
        </p>
      </div>
    </div>
  );
}
