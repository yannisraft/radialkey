const SEARCH_TESTIDS = ["SearchBox_Search_Input"];
const COMPOSER_TESTID_PREFIXES = [
  "tweetTextarea",
  "dmComposer",
  "DmComposer",
  "dmComposerTextInput",
];

const EDITABLE_SELECTOR = [
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
  "[contenteditable='']",
  "[contenteditable]",
  "textarea",
  '[role="textbox"]',
].join(",");

function testIdOf(element: Element | null): string {
  if (!element) return "";
  return element.getAttribute("data-testid") ?? "";
}

function closestMatchingTestId(element: Element): Element | null {
  let current: Element | null = element;
  while (current) {
    const id = testIdOf(current);
    if (COMPOSER_TESTID_PREFIXES.some((prefix) => id.includes(prefix))) return current;
    current = current.parentElement;
  }
  return null;
}

export function isEditableElement(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  if (element instanceof HTMLTextAreaElement)
    return !element.readOnly && !element.disabled;
  if (element instanceof HTMLInputElement) {
    return false;
  }
  if (element.getAttribute("role") === "textbox") return true;
  return element.isContentEditable || element.hasAttribute("contenteditable");
}

function isSearchField(element: HTMLElement): boolean {
  if (element.closest(SEARCH_TESTIDS.map((id) => `[data-testid="${id}"]`).join(","))) {
    return true;
  }
  const labeled = (
    element.getAttribute("aria-label") ??
    element.closest("[aria-label]")?.getAttribute("aria-label") ??
    ""
  ).toLowerCase();
  const placeholder = element.getAttribute("placeholder")?.toLowerCase() ?? "";
  if (labeled.includes("search") || placeholder.includes("search")) return true;
  return Boolean(element.closest('form[role="search"]'));
}

function hasComposerContext(element: HTMLElement): boolean {
  if (closestMatchingTestId(element)) return true;
  if (testIdOf(element).includes("tweetTextarea")) return true;
  if (element.closest(".DraftEditor-root, [data-contents='true']")) return true;
  const aria = (
    element.getAttribute("aria-label") ??
    element.closest("[aria-label]")?.getAttribute("aria-label") ??
    ""
  ).toLowerCase();
  if (/(post|reply|comment|message|tweet|what.?s happening)/i.test(aria)) return true;
  if (element.isContentEditable || element.hasAttribute("contenteditable")) return true;
  if (element.getAttribute("role") === "textbox") return true;
  if (element instanceof HTMLTextAreaElement) return true;
  return Boolean(
    element.closest(
      '[role="dialog"], [data-testid="primaryColumn"], [data-testid="DMDrawer"]',
    ),
  );
}

export function isXComposer(
  element: Element | null,
  onlyWhileWriting = true,
): element is HTMLElement {
  if (!isEditableElement(element)) return false;
  if (isSearchField(element)) return false;
  if (!onlyWhileWriting) return true;
  return hasComposerContext(element);
}

function nodeToElement(node: EventTarget | null): Element | null {
  if (node instanceof Element) return node;
  if (node instanceof Node) return node.parentElement;
  return null;
}

export function findEditableAncestor(start: Element | null): HTMLElement | null {
  let current: Element | null = start;
  while (current) {
    if (isEditableElement(current)) return current;
    current = current.parentElement;
  }
  return start?.closest(EDITABLE_SELECTOR) as HTMLElement | null;
}

function pointInRect(x: number, y: number, rect: DOMRect, pad = 28): boolean {
  return (
    x >= rect.left - pad &&
    x <= rect.right + pad &&
    y >= rect.top - pad &&
    y <= rect.bottom + pad
  );
}

export function resolveComposerFromEvent(
  source: Event | EventTarget | null,
  onlyWhileWriting: boolean,
): HTMLElement | null {
  const event = source instanceof Event ? source : null;
  const path = event?.composedPath() ?? [];
  const candidates: Array<EventTarget | null> = path.length
    ? path
    : [source instanceof Event ? source.target : source];

  for (const node of candidates) {
    const start = nodeToElement(node);
    if (!start) continue;
    const editable = findEditableAncestor(start);
    if (editable && isXComposer(editable, onlyWhileWriting)) return editable;
  }

  const active = getActiveComposer(onlyWhileWriting);
  if (!active || !event || !("clientX" in event)) return null;
  const mouse = event as MouseEvent;
  if (pointInRect(mouse.clientX, mouse.clientY, active.getBoundingClientRect())) {
    return active;
  }
  return null;
}

export function getActiveComposer(onlyWhileWriting: boolean): HTMLElement | null {
  const active = document.activeElement;
  if (isXComposer(active, onlyWhileWriting)) return active;
  const nested = active?.shadowRoot?.activeElement ?? null;
  if (nested && isXComposer(nested, onlyWhileWriting)) {
    return nested as HTMLElement;
  }
  if (active instanceof HTMLElement) {
    const editable = findEditableAncestor(active);
    if (editable && isXComposer(editable, onlyWhileWriting)) return editable;
  }
  return null;
}
