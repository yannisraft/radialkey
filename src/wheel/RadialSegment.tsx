import type { WedgeGeom } from "./wheel-geometry";

interface Props {
  wedge: WedgeGeom;
  active: boolean;
}

export function RadialSegment({ wedge, active }: Props) {
  return (
    <path
      className={active ? "rx-wedge is-active" : "rx-wedge"}
      d={wedge.path}
      aria-hidden="true"
    />
  );
}
