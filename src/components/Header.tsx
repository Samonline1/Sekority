import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full border-b border-neutral-200 bg-white sticky top-0 z-20">
      <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-1.5 shrink-0">
          <span className="font-extrabold text-lg tracking-tight text-black">
            SEKORITY
          </span>
          <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-neutral-700">
            SOS
          </span>
        </Link>
        <nav className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
          <Link
            href="/trip"
            className="text-[11px] font-bold px-2 py-1 bg-neutral-100 text-black border border-neutral-200 rounded-md hover:border-black transition-colors shrink-0"
          >
            Trip
          </Link>
          <Link
            href="/gps"
            className="text-[11px] font-bold px-2 py-1 bg-neutral-100 text-black border border-neutral-200 rounded-md hover:border-black transition-colors shrink-0"
          >
            GPS
          </Link>
          <Link
            href="/ring"
            className="text-[11px] font-bold px-2 py-1 bg-neutral-100 text-black border border-neutral-200 rounded-md hover:border-black transition-colors shrink-0"
          >
            Ring
          </Link>
          <Link
            href="/chk"
            className="text-[11px] font-bold px-2 py-1 bg-neutral-100 text-black border border-neutral-200 rounded-md hover:border-black transition-colors shrink-0"
          >
            Chk
          </Link>
          <Link
            href="/chat"
            className="text-[11px] font-bold px-2 py-1 bg-black text-white rounded-md hover:bg-neutral-800 transition-colors shrink-0 shadow-xs"
          >
            Chat
          </Link>
        </nav>
      </div>
    </header>
  );
}
