import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full border-b border-neutral-200 bg-white sticky top-0 z-20">
      <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-extrabold text-xl tracking-tight text-black">
            ALERT
          </span>
          <span className="text-xs uppercase font-mono tracking-widest px-2 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-neutral-700">
            SECURE
          </span>
        </Link>
        <div className="flex items-center space-x-3">
          <Link
            href="/chat"
            className="text-xs font-bold px-3 py-1.5 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors tracking-tight shadow-xs"
          >
            Emergency Chat 💬
          </Link>
          <div
            role="status"
            aria-label="System status"
            className="flex items-center space-x-1.5 text-xs font-medium text-neutral-600"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
            <span className="hidden sm:inline">Online</span>
          </div>
        </div>
      </div>
    </header>
  );
}
