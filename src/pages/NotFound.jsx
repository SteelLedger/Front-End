import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5 flex items-center justify-center">
      <div className="max-w-md text-center">
        <p className="text-6xl font-bold text-[#1E4D96]">404</p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          The page you're looking for doesn't exist or has moved.
        </p>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1E4D96] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1A3F7A]"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
