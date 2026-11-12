const corner = 'absolute h-3.5 w-3.5 border-ink'

/** The thin frame round the view, with its four corner marks, and the readout's place at bottom right. */
export function Frame() {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-3.5 z-[2] border border-ink opacity-[0.22]">
        <i className={`${corner} -left-px -top-px border-l-[3px] border-t-[3px]`} />
        <i className={`${corner} -right-px -top-px border-r-[3px] border-t-[3px]`} />
        <i className={`${corner} -bottom-px -left-px border-b-[3px] border-l-[3px]`} />
        <i className={`${corner} -bottom-px -right-px border-b-[3px] border-r-[3px]`} />
      </div>
      {/* Filled in by the canvas (Task 14). */}
      <div
        id="view-readout"
        className="pointer-events-none fixed bottom-9 right-10 z-[5] text-right font-mono text-[10.5px] uppercase leading-[1.9] tracking-[0.13em] text-muted max-[820px]:hidden"
      />
    </>
  )
}
