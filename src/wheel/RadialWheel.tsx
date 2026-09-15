import { useMemo, useSyncExternalStore } from "react";
import { RadialSegment } from "./RadialSegment";
import { SecondaryItems } from "./SecondaryItems";
import { appearanceVars, motionDuration } from "./appearance";
import { buildWedges, visibleItems } from "./wheel-geometry";
import type { WheelStore } from "./wheel-state";

interface Props {
  store: WheelStore;
  onCancel: () => void;
}

export function RadialWheel({ store, onCancel }: Props) {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const settings = state.settings;
  const layout = settings?.wheel;
  const items = layout ? visibleItems(state.items, layout.segmentCount) : [];
  const radius = layout?.radius ?? 100;
  const dead = layout?.deadZoneRadius ?? 35;
  const secondary = layout?.secondaryDistance ?? 135;
  const segmentCount = layout?.segmentCount ?? 6;
  const size = Math.max(secondary + 56, radius + 48) * 2;
  const cx = size / 2;
  const cy = size / 2;
  const wedges = useMemo(
    () => buildWedges(Math.max(items.length, segmentCount), dead, radius, cx, cy),
    [items.length, segmentCount, dead, radius, cx, cy],
  );

  if (!state.open || !settings || !layout) return null;

  const vars = appearanceVars(settings.appearance, state.resolvedTheme);
  const duration = motionDuration(settings.appearance);
  const activePrimary = state.selection.primaryIndex;
  const activeWedge = activePrimary !== null ? wedges[activePrimary] : undefined;
  const activeItem = activePrimary !== null ? items[activePrimary] : undefined;
  const showSecondary =
    state.selection.zone === "secondary" &&
    Boolean(activeItem && (activeItem.children?.length ?? 0) > 0);

  return (
    <div
      className={settings.appearance.animations === "off" ? "rx-motion-off" : undefined}
    >
      <div
        className="rx-wheel is-open"
        role="menu"
        aria-label="Radial writing wheel"
        style={{
          left: state.center.x,
          top: state.center.y,
          ...vars,
          ["--rx-size" as string]: `${size}px`,
          ["--rx-dead" as string]: `${layout.deadZoneRadius * 2}px`,
          ["--rx-anim-ms" as string]: `${duration}ms`,
          ["--rx-anim-fast" as string]: `${Math.max(70, duration - 30)}ms`,
        }}
      >
        <div className="rx-stage">
          <div className="rx-glass" />
          <svg className="rx-svg" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
            {wedges.map((wedge) => (
              <RadialSegment
                key={wedge.index}
                wedge={wedge}
                active={activePrimary === wedge.index}
              />
            ))}
          </svg>
          {wedges.map((wedge) => {
            const item = items[wedge.index];
            if (!item) return null;
            return (
              <div
                key={`icon-${item.id}`}
                className={
                  activePrimary === wedge.index ? "rx-icon is-active" : "rx-icon"
                }
                style={{ left: wedge.icon.x, top: wedge.icon.y }}
              >
                <span aria-hidden="true">{item.icon ?? item.label.slice(0, 2)}</span>
                <span className="rx-label">{item.label}</span>
              </div>
            );
          })}
          <div className="rx-deadzone" />
          <button
            type="button"
            className="rx-close"
            aria-label="Close radial wheel"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onCancel();
            }}
          >
            ×
          </button>
          {showSecondary && activeWedge && activeItem ? (
            <SecondaryItems
              parent={activeItem}
              midAngle={activeWedge.mid}
              radius={layout.secondaryDistance}
              cx={cx}
              cy={cy}
              activeIndex={state.selection.secondaryIndex}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
