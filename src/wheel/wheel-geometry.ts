import type {
  Point,
  WheelItem,
  WheelLayoutSettings,
  WheelSelection,
} from "./wheel-types";

const TAU = Math.PI * 2;
const START_ANGLE = -Math.PI / 2;
const WEDGE_GAP = 0.018;
/** Outer child pies are a bit wider than the parent slice, centered on it. */
const CHILD_FAN_SCALE = 1.75;
export const SECONDARY_FAN = 0.55;

export interface WedgeGeom {
  index: number;
  start: number;
  end: number;
  mid: number;
  path: string;
  icon: Point;
}

export function polar(cx: number, cy: number, radius: number, angle: number): Point {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

export function wedgePath(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  start: number,
  end: number,
): string {
  const span = end - start;
  const gap = span < 0.08 ? span * 0.08 : Math.min(WEDGE_GAP, span * 0.18);
  const a0 = start + gap;
  const a1 = end - gap;
  const p1 = polar(cx, cy, outer, a0);
  const p2 = polar(cx, cy, outer, a1);
  const p3 = polar(cx, cy, inner, a1);
  const p4 = polar(cx, cy, inner, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

const geometryCache = new Map<string, WedgeGeom[]>();

export function buildWedges(
  count: number,
  inner: number,
  outer: number,
  cx: number,
  cy: number,
): WedgeGeom[] {
  const key = `${count}:${inner}:${outer}:${cx}:${cy}`;
  const cached = geometryCache.get(key);
  if (cached) return cached;

  const slice = TAU / Math.max(1, count);
  const wedges: WedgeGeom[] = [];
  for (let i = 0; i < count; i += 1) {
    const start = START_ANGLE + i * slice;
    const end = start + slice;
    const mid = (start + end) / 2;
    const iconR = (inner + outer) / 2;
    wedges.push({
      index: i,
      start,
      end,
      mid,
      path: wedgePath(cx, cy, inner, outer, start, end),
      icon: polar(cx, cy, iconR, mid),
    });
  }
  geometryCache.set(key, wedges);
  return wedges;
}

export function normalizeAngle(angle: number): number {
  let a = angle - START_ANGLE;
  a = ((a % TAU) + TAU) % TAU;
  return a;
}

export function primaryIndexFromAngle(angle: number, count: number): number {
  const n = Math.max(1, count);
  const slice = TAU / n;
  return Math.min(n - 1, Math.floor(normalizeAngle(angle) / slice));
}

export function childFan(
  parentIndex: number,
  parentCount: number,
  childCount: number,
): { start: number; slice: number } {
  const n = Math.max(1, childCount);
  const parentSlice = TAU / Math.max(1, parentCount);
  const mid = START_ANGLE + (parentIndex + 0.5) * parentSlice;
  const spread = parentSlice * CHILD_FAN_SCALE;
  return { start: mid - spread / 2, slice: spread / n };
}

export function buildChildWedges(
  parentIndex: number,
  parentCount: number,
  childCount: number,
  inner: number,
  outer: number,
  cx: number,
  cy: number,
): WedgeGeom[] {
  const n = Math.max(1, childCount);
  const { start: start0, slice: childSlice } = childFan(parentIndex, parentCount, n);
  const iconR = (inner + outer) / 2;
  const wedges: WedgeGeom[] = [];
  for (let i = 0; i < n; i += 1) {
    const start = start0 + i * childSlice;
    const end = start + childSlice;
    const mid = (start + end) / 2;
    wedges.push({
      index: i,
      start,
      end,
      mid,
      path: wedgePath(cx, cy, inner, outer, start, end),
      icon: polar(cx, cy, iconR, mid),
    });
  }
  return wedges;
}

export function visibleItems(items: WheelItem[], segmentCount: number): WheelItem[] {
  return items.slice(0, segmentCount);
}

export function resolveSelection(
  angle: number,
  distance: number,
  items: WheelItem[],
  layout: WheelLayoutSettings,
  lockedPrimary: number | null = null,
): WheelSelection {
  const primaryItems = visibleItems(items, layout.segmentCount);
  const scaled = distance * layout.sensitivity;
  const empty: WheelSelection = {
    primaryIndex: null,
    secondaryIndex: null,
    zone: "dead",
    item: null,
  };

  if (primaryItems.length === 0) return empty;
  if (scaled < layout.deadZoneRadius) return { ...empty, zone: "dead" };

  let index = primaryIndexFromAngle(angle, primaryItems.length);
  const secondaryOuter = layout.secondaryDistance + 36;
  const inOuterRing = scaled >= layout.radius && scaled <= secondaryOuter;
  if (inOuterRing && lockedPrimary !== null) {
    const locked = primaryItems[lockedPrimary];
    if (locked?.children?.length) index = lockedPrimary;
  }

  const primary = primaryItems[index];
  if (!primary) return empty;

  if (scaled < layout.radius || !primary.children?.length) {
    if (scaled > secondaryOuter) {
      return { primaryIndex: index, secondaryIndex: null, zone: "outside", item: null };
    }
    return {
      primaryIndex: index,
      secondaryIndex: null,
      zone: "primary",
      item: primary,
    };
  }

  if (scaled > secondaryOuter) {
    return { primaryIndex: index, secondaryIndex: null, zone: "outside", item: null };
  }

  const children = primary.children;
  const n = children.length;
  const { start, slice: childSlice } = childFan(index, primaryItems.length, n);
  const spread = childSlice * n;
  const fanMid = start + spread / 2;
  let delta = angle - fanMid;
  while (delta > Math.PI) delta -= TAU;
  while (delta < -Math.PI) delta += TAU;
  const half = spread / 2;
  const along = Math.min(half, Math.max(-half, delta)) + half;
  const secondaryIndex = Math.min(
    n - 1,
    Math.max(0, Math.floor(Math.min(along, spread - 1e-6) / childSlice)),
  );
  const child = children[secondaryIndex] ?? primary;
  return {
    primaryIndex: index,
    secondaryIndex,
    zone: "secondary",
    item: child,
  };
}

export function secondaryPositions(
  count: number,
  midAngle: number,
  radius: number,
  cx: number,
  cy: number,
  fanSpread = SECONDARY_FAN,
): Point[] {
  if (count <= 0) return [];
  if (count === 1) return [polar(cx, cy, radius, midAngle)];
  const spread = fanSpread;
  const start = midAngle - spread / 2;
  const step = spread / (count - 1);
  return Array.from({ length: count }, (_, i) => polar(cx, cy, radius, start + i * step));
}

export function clampCenter(
  center: Point,
  half: number,
  viewport: { width: number; height: number },
  padding = 16,
): Point {
  return {
    x: Math.min(viewport.width - half - padding, Math.max(half + padding, center.x)),
    y: Math.min(
      viewport.height - half - padding,
      Math.max(half + padding + 28, center.y),
    ),
  };
}

export function selectionKey(selection: WheelSelection): string {
  return `${selection.zone}:${selection.primaryIndex}:${selection.secondaryIndex}:${selection.item?.id ?? ""}`;
}

export function describeSelection(items: WheelItem[], selection: WheelSelection): string {
  if (!selection.item || selection.primaryIndex === null) return "None";
  const primary = items[selection.primaryIndex];
  if (!primary) return selection.item.label;
  if (selection.zone === "secondary" && selection.item.id !== primary.id) {
    return `${primary.label} → ${selection.item.label}`;
  }
  return primary.label;
}
