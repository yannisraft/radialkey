import { insertTextAtCaret, saveCaret } from "./caret-insertion";
import {
  getActiveComposer,
  isXComposer,
  resolveComposerFromEvent,
} from "./composer-detector";
import type { CaretSnapshot, ComposerPort } from "../wheel/wheel-types";

export function createXAdapter(getOnlyWhileWriting: () => boolean): ComposerPort {
  return {
    resolveComposer(source: Event | EventTarget | null): HTMLElement | null {
      return resolveComposerFromEvent(source, getOnlyWhileWriting());
    },
    getActiveComposer(): HTMLElement | null {
      return getActiveComposer(getOnlyWhileWriting());
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

export function composerFromEvent(
  source: Event | EventTarget | null,
  onlyWhileWriting: boolean,
): HTMLElement | null {
  return resolveComposerFromEvent(source, onlyWhileWriting);
}

export { isXComposer };
