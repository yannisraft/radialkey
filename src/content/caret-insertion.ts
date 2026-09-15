import type { CaretSnapshot } from "../wheel/wheel-types";

function isValueElement(
  element: HTMLElement,
): element is HTMLTextAreaElement | HTMLInputElement {
  return element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement;
}

function setNativeValue(
  element: HTMLTextAreaElement | HTMLInputElement,
  value: string,
): void {
  const proto =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  descriptor?.set?.call(element, value);
  if (!descriptor?.set) element.value = value;
}

function dispatchInput(element: HTMLElement, text: string): void {
  const init: InputEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    data: text,
    inputType: "insertText",
  };
  element.dispatchEvent(new InputEvent("beforeinput", init));
  element.dispatchEvent(new InputEvent("input", init));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

export function saveCaret(element: HTMLElement): CaretSnapshot | null {
  if (isValueElement(element)) {
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? start;
    return { element, kind: "value", start, end, range: null };
  }

  const selection = element.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return { element, kind: "contenteditable", start: 0, end: 0, range: null };
  }
  const range = selection.getRangeAt(0);
  if (
    !element.contains(range.commonAncestorContainer) &&
    range.commonAncestorContainer !== element
  ) {
    return { element, kind: "contenteditable", start: 0, end: 0, range: null };
  }
  return {
    element,
    kind: "contenteditable",
    start: 0,
    end: 0,
    range: range.cloneRange(),
  };
}

export function restoreCaret(snapshot: CaretSnapshot): void {
  snapshot.element.focus({ preventScroll: true });
  if (snapshot.kind === "value" && isValueElement(snapshot.element)) {
    snapshot.element.setSelectionRange(snapshot.start, snapshot.end);
    return;
  }
  if (snapshot.range) {
    const selection = snapshot.element.ownerDocument.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(snapshot.range);
  }
}

export function insertTextAtCaret(snapshot: CaretSnapshot, text: string): boolean {
  const { element } = snapshot;
  restoreCaret(snapshot);

  if (snapshot.kind === "value" && isValueElement(element)) {
    const value = element.value;
    const next = value.slice(0, snapshot.start) + text + value.slice(snapshot.end);
    setNativeValue(element, next);
    const caret = snapshot.start + text.length;
    element.setSelectionRange(caret, caret);
    dispatchInput(element, text);
    return true;
  }

  const selection = element.ownerDocument.getSelection();
  if (snapshot.range && selection) {
    selection.removeAllRanges();
    selection.addRange(snapshot.range);
  }

  let inserted = false;
  try {
    inserted = element.ownerDocument.execCommand("insertText", false, text);
  } catch {
    inserted = false;
  }

  if (!inserted) {
    const sel = element.ownerDocument.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const node = element.ownerDocument.createTextNode(text);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      inserted = true;
    } else {
      element.append(text);
      inserted = true;
    }
  }

  dispatchInput(element, text);
  return inserted;
}
