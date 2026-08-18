"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { MediaItem } from "@/content/types";

/**
 * Thumbnail strip plus a native <dialog> lightbox. Native dialog gives focus
 * trapping, Esc-to-close and an inert background for free — the three things
 * hand-rolled modals get wrong.
 */
/**
 * `strip` is the default: a compact row of thumbnails under a project.
 * `wall` hangs the same pictures as framed work — a mount, a frame and a
 * shadow, bigger. The library is a room you walk into, and art in a room is on
 * the wall, not in a filmstrip. Both open the same lightbox.
 */
export function Gallery({
  items,
  label,
  variant = "strip",
}: {
  items: MediaItem[];
  label: string;
  variant?: "strip" | "wall";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);

  const open = useCallback((i: number, trigger: HTMLButtonElement) => {
    setIndex(i);
    // Focus the invoking thumbnail explicitly before showModal(). Native
    // <dialog> restores focus to whatever was document.activeElement when
    // showModal() was called — that's the click target in Chrome/Firefox,
    // but Safari has historically not focused buttons on mouse click, so
    // without this the post-close focus target would be browser-dependent.
    trigger.focus();
    dialogRef.current?.showModal();
  }, []);

  const step = useCallback(
    (delta: number) =>
      setIndex((i) => (i + delta + items.length) % items.length),
    [items.length],
  );

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [step]);

  if (!items.length) return null;
  const current = items[index]!;
  const wall = variant === "wall";

  return (
    <>
      <ul
        className={
          wall ? "mt-4 flex flex-wrap gap-5" : "mt-4 flex flex-wrap gap-3"
        }
      >
        {items.map((m, i) => (
          <li key={m.src}>
            <button
              type="button"
              onClick={(e) => open(i, e.currentTarget)}
              className={[
                "relative block overflow-hidden bg-surface-raised ring-1 ring-rule",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                wall
                  ? // A frame: a deep mount, a heavier edge, and a shadow so it
                    // sits off the wall. Lifts a touch when you go to look.
                    "h-36 w-36 rounded-sm p-3 shadow-lg shadow-black/25 ring-4 transition-transform duration-200 ease-out hover:-translate-y-1 hover:ring-accent focus-visible:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  : "h-24 w-24 rounded-lg p-1 transition-shadow hover:ring-accent",
              ].join(" ")}
            >
              {/* Square and contained. These were 2:1 and object-cover, which
                  centre-cropped every portrait piece into a letterbox of its
                  own middle — beheading the tattoo flash and half the
                  drawings. A gallery thumbnail may shrink a picture; it may
                  not decide which part of it you get to see. */}
              <Image
                src={m.src}
                alt={m.alt}
                fill
                sizes={wall ? "9rem" : "6rem"}
                className="object-contain"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={`${label} gallery`}
        // Click outside to close, the same as every other dialog here. A click
        // on the ::backdrop is reported against the dialog element itself, so
        // this fires only out there — which is why the padding lives on the
        // inner box and not on the dialog.
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        // An explicit width, not just a max: a dialog is width:fit-content and
        // its only child was `w-full` — a percentage of a box being sized by
        // its own contents. The picture came out a couple of hundred pixels
        // wide whatever it was a picture of.
        className="w-[min(90vw,72rem)] max-w-none rounded-xl bg-surface-raised p-0 text-fg ring-1 ring-rule backdrop:bg-black/70"
      >
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-xl leading-none text-fg-muted ring-1 ring-rule transition-colors hover:text-accent hover:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="p-4">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg">
            <Image
              src={current.src}
              alt={current.alt}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>
          <p className="mt-3 font-sans text-sm text-fg-muted">
            {current.caption ?? current.alt}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => step(-1)}
                className="rounded-full px-3 py-1.5 font-sans text-sm ring-1 ring-rule hover:text-accent hover:ring-accent"
              >
                ← Previous
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                className="rounded-full px-3 py-1.5 font-sans text-sm ring-1 ring-rule hover:text-accent hover:ring-accent"
              >
                Next →
              </button>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-full bg-fill px-4 py-1.5 font-sans text-sm font-semibold text-fill-fg"
            >
              Close
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
