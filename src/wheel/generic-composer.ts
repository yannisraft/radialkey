import { insertTextAtCaret, saveCaret } from "../content/caret-insertion";
import type { CaretSnapshot, ComposerPort } from "../wheel/wheel-types";

export function createGenericComposerPort(root: ParentNode = document): ComposerPort {
  const isEditable = (element: Element | null): element is HTMLElement => {
    if (!(element instanceof HTMLElement)) return false;
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      return !element.readOnly && !element.disabled;
    }
    return element.isContentEditable;
  };

  return {
    resolveComposer(source: Event | EventTarget | null): HTMLElement | null {
      const event = source instanceof Event ? source : null;
      const path = event?.composedPath() ?? [
        source instanceof Event ? source.target : source,
      ];
      for (const node of path) {
        const start =
          node instanceof Element
            ? node
            : node instanceof Node
              ? node.parentElement
              : null;
        if (!start || !root.contains(start)) continue;
        const editable = start.closest(
          "textarea, input, [contenteditable], [contenteditable='true'], [contenteditable='plaintext-only'], [role='textbox']",
        );
        if (isEditable(editable)) return editable;
      }
      return null;
    },
    getActiveComposer(): HTMLElement | null {
      const active = document.activeElement;
      if (isEditable(active) && root.contains(active)) return active;
      return null;
    },
    saveCaret(element: HTMLElement): CaretSnapshot | null {
      return saveCaret(element);
    },
    insertAtCaret(snapshot: CaretSnapshot, text: string): boolean {
      return insertTextAtCaret(snapshot, text);
    },
    subscribeComposerGone(element: HTMLElement, onGone: () => void): () => void {
      const observer = new MutationObserver(() => {
        if (!element.isConnected) onGone();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      return () => observer.disconnect();
    },
  };
}
