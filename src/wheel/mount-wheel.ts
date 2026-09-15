import { appearanceVars, motionDuration } from "./appearance";
import { buildChildWedges, buildWedges, visibleItems } from "./wheel-geometry";
import type { WheelStore, WheelViewState } from "./wheel-state";
import type { WheelItem, WheelLayoutSettings } from "./wheel-types";

const SVG_NS = "http://www.w3.org/2000/svg";

interface WheelDom {
  shell: HTMLElement;
  wheel: HTMLElement;
  svg: SVGSVGElement;
  paths: SVGPathElement[];
  icons: HTMLElement[];
  outerGroup: SVGGElement;
  outerIcons: HTMLElement;
  cancel: HTMLElement;
  layoutKey: string;
  secondaryKey: string;
}

export function bindWheelView(
  mount: HTMLElement,
  store: WheelStore,
  onCancel: () => void,
): () => void {
  const root = document.createElement("div");
  mount.append(root);
  let dom: WheelDom | null = null;

  const paint = () => {
    dom = paintWheel(root, dom, store.getSnapshot(), onCancel);
  };

  const unsubscribe = store.subscribe(paint);
  paint();
  return () => {
    unsubscribe();
    root.remove();
  };
}

function layoutKey(state: WheelViewState): string {
  const settings = state.settings;
  if (!settings) return "";
  const ids = visibleItems(state.items, settings.wheel.segmentCount)
    .map((item) => item.id)
    .join(",");
  const w = settings.wheel;
  return `${w.segmentCount}:${w.radius}:${w.deadZoneRadius}:${w.secondaryDistance}:${ids}:${state.center.x}:${state.center.y}`;
}

function applyVars(wheel: HTMLElement, state: WheelViewState): void {
  const settings = state.settings;
  if (!settings) return;
  const layout = settings.wheel;
  const size = Math.max(layout.secondaryDistance + 24, layout.radius + 48) * 2;
  const duration = motionDuration(settings.appearance);
  const vars = appearanceVars(settings.appearance, state.resolvedTheme);
  Object.entries({
    ...vars,
    "--rx-size": `${size}px`,
    "--rx-dead": `${layout.deadZoneRadius * 2}px`,
    "--rx-radius": `${layout.radius * 2}px`,
    "--rx-anim-ms": `${duration}ms`,
    "--rx-anim-fast": `${Math.max(70, duration - 30)}ms`,
  }).forEach(([key, value]) => wheel.style.setProperty(key, value));
}

function paintWheel(
  root: HTMLElement,
  existing: WheelDom | null,
  state: WheelViewState,
  onCancel: () => void,
): WheelDom | null {
  const settings = state.settings;
  if (!state.open || !settings) {
    existing?.shell.remove();
    return null;
  }

  const key = layoutKey(state);
  const dom = existing && existing.layoutKey === key ? existing : buildWheel(root, state, onCancel);
  applyVars(dom.wheel, state);
  updateSelection(dom, state);
  return dom;
}

function buildWheel(root: HTMLElement, state: WheelViewState, onCancel: () => void): WheelDom {
  const settings = state.settings!;
  const layout = settings.wheel;
  const items = visibleItems(state.items, layout.segmentCount);
  const size = Math.max(layout.secondaryDistance + 24, layout.radius + 48) * 2;
  const cx = size / 2;
  const cy = size / 2;
  const wedges = buildWedges(
    Math.max(items.length, layout.segmentCount),
    layout.deadZoneRadius,
    layout.radius,
    cx,
    cy,
  );

  const shell = document.createElement("div");
  if (settings.appearance.animations === "off") shell.className = "rx-motion-off";

  const wheel = document.createElement("div");
  wheel.className = "rx-wheel is-open";
  wheel.setAttribute("role", "menu");
  wheel.setAttribute("aria-label", "Radial writing wheel");
  wheel.style.left = `${state.center.x}px`;
  wheel.style.top = `${state.center.y}px`;

  const stage = document.createElement("div");
  stage.className = "rx-stage";

  const glass = document.createElement("div");
  glass.className = "rx-glass";

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "rx-svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("aria-hidden", "true");

  const paths: SVGPathElement[] = [];
  for (const wedge of wedges) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("class", "rx-wedge");
    path.setAttribute("d", wedge.path);
    svg.append(path);
    paths.push(path);
  }

  const outerGroup = document.createElementNS(SVG_NS, "g");
  outerGroup.setAttribute("class", "rx-outer");
  svg.append(outerGroup);

  stage.append(glass, svg);

  const icons: HTMLElement[] = [];
  for (const wedge of wedges) {
    const item = items[wedge.index];
    const icon = document.createElement("div");
    icon.className = "rx-icon";
    icon.style.left = `${wedge.icon.x}px`;
    icon.style.top = `${wedge.icon.y}px`;
    if (item) {
      const glyph = document.createElement("span");
      glyph.className = "rx-glyph";
      glyph.setAttribute("aria-hidden", "true");
      glyph.textContent = item.icon ?? item.label.slice(0, 2);
      const label = document.createElement("span");
      label.className = "rx-label";
      label.textContent = item.label;
      icon.append(glyph, label);
    } else {
      icon.hidden = true;
    }
    stage.append(icon);
    icons.push(icon);
  }

  const cancel = document.createElement("div");
  cancel.className = "rx-deadzone rx-close";
  cancel.setAttribute("role", "button");
  cancel.setAttribute("aria-label", "Cancel");
  const cancelX = document.createElement("span");
  cancelX.className = "rx-cancel-x";
  cancelX.textContent = "×";
  const cancelLabel = document.createElement("span");
  cancelLabel.className = "rx-cancel-label";
  cancelLabel.textContent = "Cancel";
  cancel.append(cancelX, cancelLabel);
  cancel.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onCancel();
  });
  stage.append(cancel);

  const outerIcons = document.createElement("div");
  outerIcons.className = "rx-outer-icons";
  stage.append(outerIcons);

  wheel.append(stage);
  shell.append(wheel);
  root.replaceChildren(shell);

  return {
    shell,
    wheel,
    svg,
    paths,
    icons,
    outerGroup,
    outerIcons,
    cancel,
    layoutKey: layoutKey(state),
    secondaryKey: "",
  };
}

function updateSelection(dom: WheelDom, state: WheelViewState): void {
  const settings = state.settings;
  if (!settings) return;
  const layout = settings.wheel;
  const items = visibleItems(state.items, layout.segmentCount);
  const activePrimary = state.selection.primaryIndex;
  const inDead = state.selection.zone === "dead";

  dom.cancel.classList.toggle("is-active", inDead);
  dom.paths.forEach((path, index) => {
    path.setAttribute("class", activePrimary === index ? "rx-wedge is-active" : "rx-wedge");
  });
  dom.icons.forEach((icon, index) => {
    if (icon.hidden) return;
    icon.className = activePrimary === index ? "rx-icon is-active" : "rx-icon";
  });

  const size = Math.max(layout.secondaryDistance + 24, layout.radius + 48) * 2;
  const activeItem = activePrimary !== null ? items[activePrimary] : undefined;
  const showOuter = Boolean(activeItem && (activeItem.children?.length ?? 0) > 0 && !inDead);

  const nextKey = showOuter && activeItem && activePrimary !== null ? `${activeItem.id}:${activePrimary}` : "";
  if (nextKey !== dom.secondaryKey) {
    dom.secondaryKey = nextKey;
    renderOuterRing(dom, showOuter ? activeItem : undefined, activePrimary, items.length, layout, size);
  }

  [...dom.outerGroup.children].forEach((node, index) => {
    node.setAttribute(
      "class",
      state.selection.zone === "secondary" && state.selection.secondaryIndex === index
        ? "rx-wedge rx-wedge-outer is-active"
        : "rx-wedge rx-wedge-outer",
    );
  });
  [...dom.outerIcons.children].forEach((node, index) => {
    if (!(node instanceof HTMLElement)) return;
    node.classList.toggle(
      "is-active",
      state.selection.zone === "secondary" && state.selection.secondaryIndex === index,
    );
  });
}

function renderOuterRing(
  dom: WheelDom,
  parent: WheelItem | undefined,
  parentIndex: number | null,
  parentCount: number,
  layout: WheelLayoutSettings,
  size: number,
): void {
  dom.outerGroup.replaceChildren();
  dom.outerIcons.replaceChildren();
  if (!parent?.children?.length || parentIndex === null) return;

  const cx = size / 2;
  const cy = size / 2;
  const inner = layout.radius + 3;
  const outer = layout.secondaryDistance;
  const wedges = buildChildWedges(
    parentIndex,
    Math.max(parentCount, 1),
    parent.children.length,
    inner,
    outer,
    cx,
    cy,
  );

  wedges.forEach((wedge, index) => {
    const child = parent.children![index];
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("class", "rx-wedge rx-wedge-outer");
    path.setAttribute("d", wedge.path);
    dom.outerGroup.append(path);

    if (!child) return;
    const snippet = child.label.length > 2 && child.icon !== child.label;
    const icon = document.createElement("div");
    icon.className = snippet ? "rx-icon rx-icon-outer is-snippet" : "rx-icon rx-icon-outer";
    icon.style.left = `${wedge.icon.x}px`;
    icon.style.top = `${wedge.icon.y}px`;
    const n = parent.children!.length;
    icon.style.fontSize = snippet ? "10px" : n > 8 ? "18px" : n > 5 ? "21px" : "24px";
    icon.textContent = snippet ? child.label : (child.icon ?? child.label);
    dom.outerIcons.append(icon);
  });
}
