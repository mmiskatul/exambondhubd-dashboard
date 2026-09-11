import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-xl border border-slate-200 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
          <FileQuestion className="w-7 h-7 text-slate-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Page not found</h1>
          <p className="text-xs text-slate-500 mt-1.5">
            There's nothing at this address in the admin console.
          </p>
        </div>
        <a
          href="/"
          className="inline-block px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
