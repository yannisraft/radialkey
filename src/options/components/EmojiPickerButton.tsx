import { useEffect, useRef, useState } from "react";
import Picker from "emoji-picker-element/picker";
import type { EmojiClickEvent } from "emoji-picker-element/shared";

function emojiDataUrl(): string {
  try {
    return chrome.runtime.getURL("emoji-data.json");
  } catch {
    return new URL("/emoji-data.json", document.baseURI).href;
  }
}

interface Props {
  value: string;
  label: string;
  onPick: (emoji: string) => void;
}

export function EmojiPickerButton({ value, label, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!open) return;
    const host = hostRef.current;
    if (!host) return;

    const picker = new Picker({ dataSource: emojiDataUrl() });
    picker.classList.add("dark");
    const onClick = (event: EmojiClickEvent) => {
      const emoji = event.detail.unicode;
      if (!emoji) return;
      onPickRef.current(emoji);
      setOpen(false);
    };
    picker.addEventListener("emoji-click", onClick);
    host.replaceChildren(picker);

    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (event.composedPath().includes(root)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKey, true);

    return () => {
      picker.removeEventListener("emoji-click", onClick);
      picker.remove();
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div className="emoji-pick" ref={rootRef}>
      <button
        type="button"
        className="emoji-pick-trigger"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {value || "✦"}
      </button>
      {open ? <div className="emoji-pick-pop" ref={hostRef} /> : null}
    </div>
  );
}

export function isPlainEmojiItem(icon: string | undefined, insertValue: string): boolean {
  if (icon !== undefined && icon !== insertValue) return false;
  if (/\s/.test(insertValue) || /[A-Za-z]/.test(insertValue)) return false;
  return insertValue.length > 0 && insertValue.length <= 16;
}
