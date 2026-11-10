export default function Instructions() {
  return (
    <section
      aria-labelledby="instructions-heading"
      className="w-full bg-[#F6F6F6] border border-neutral-200 rounded-xl p-4 text-sm text-neutral-800"
    >
      <h2 id="instructions-heading" className="font-semibold text-black mb-1">
        Screen-Reader, Audio SFX & Keyboard Guide
      </h2>
      <p className="text-neutral-600 mb-2 leading-relaxed text-xs sm:text-sm">
        When the page opens, an <strong>automatic 5-second countdown</strong> starts. Real-time audio tones indicate the progress:
      </p>
      <ul className="list-disc list-inside space-y-1 text-xs text-neutral-600">
        <li><strong>Rising Beeps:</strong> Count down each second (5, 4, 3, 2, 1).</li>
        <li><strong>Cancel Alert Button:</strong> Press <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded font-mono text-xs font-bold text-black">Tab</kbd> to focus and disarm before 0.</li>
        <li><strong>Trigger Now Button:</strong> Dispatches immediately without waiting.</li>
        <li><strong>Success Chime:</strong> Ascending musical chord when emergency channels deliver.</li>
        <li><strong>Spoken Voice:</strong> Text-to-Speech vocalizes status updates directly through speakers.</li>
      </ul>
    </section>
  );
}
