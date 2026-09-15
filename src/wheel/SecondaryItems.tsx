import type { WheelItem } from "./wheel-types";
import { secondaryPositions } from "./wheel-geometry";

interface Props {
  parent: WheelItem;
  midAngle: number;
  radius: number;
  cx: number;
  cy: number;
  activeIndex: number | null;
}

export function SecondaryItems({ parent, midAngle, radius, cx, cy, activeIndex }: Props) {
  const children = parent.children ?? [];
  const points = secondaryPositions(children.length, midAngle, radius, cx, cy);
  return (
    <>
      {children.map((child, index) => {
        const point = points[index];
        if (!point) return null;
        const snippet = child.label.length > 2;
        return (
          <div
            key={child.id}
            className={[
              "rx-secondary",
              snippet ? "is-snippet" : "",
              activeIndex === index ? "is-active" : "",
            ].join(" ")}
            style={{
              left: point.x,
              top: point.y,
              ["--rx-stagger" as string]: `${index * 18}ms`,
            }}
          >
            {child.icon && !snippet ? child.icon : child.label}
          </div>
        );
      })}
    </>
  );
}
