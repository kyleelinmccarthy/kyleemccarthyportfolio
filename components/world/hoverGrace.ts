/**
 * A hovered landmark's label goes dark only a while after the pointer leaves
 * it, so the pointer can travel onto its tag. `mark(id, hot)` lights a label or
 * puts it out; `heat` lights one at once (cancelling its grace), `coolLater`
 * puts it out after `ms`, and `clear` cancels every grace still running and
 * puts those labels out, for when the landmarks go.
 */
export function hoverGrace(mark: (id: string, hot: boolean) => void, ms: number) {
  const cooling = new Map<string, ReturnType<typeof setTimeout>>()
  const cancel = (id: string) => {
    const pending = cooling.get(id)
    if (pending !== undefined) {
      clearTimeout(pending)
      cooling.delete(id)
    }
  }
  return {
    heat(id: string) {
      cancel(id)
      mark(id, true)
    },
    coolNow(id: string) {
      cancel(id)
      mark(id, false)
    },
    coolLater(id: string) {
      if (cooling.has(id)) return
      cooling.set(
        id,
        setTimeout(() => {
          cooling.delete(id)
          mark(id, false)
        }, ms),
      )
    },
    clear() {
      for (const id of [...cooling.keys()]) {
        cancel(id)
        mark(id, false)
      }
    },
    /** How many graces are still running. */
    get pending() {
      return cooling.size
    },
  }
}
