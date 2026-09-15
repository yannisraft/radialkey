import type { SegmentCount, WheelLayoutSettings } from "../../wheel/wheel-types";

interface Props {
  value: WheelLayoutSettings;
  onChange: (value: WheelLayoutSettings) => void;
}

export function LayoutSection({ value, onChange }: Props) {
  return (
    <div className="grid two">
      <label className="field">
        Segments
        <select
          value={value.segmentCount}
          onChange={(event) =>
            onChange({
              ...value,
              segmentCount: Number(event.target.value) as SegmentCount,
            })
          }
        >
          <option value={4}>4</option>
          <option value={6}>6</option>
          <option value={8}>8</option>
        </select>
      </label>
      <label className="field">
        Mouse sensitivity
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.05}
          value={value.sensitivity}
          onChange={(event) =>
            onChange({ ...value, sensitivity: Number(event.target.value) })
          }
        />
      </label>
      <label className="field">
        Wheel radius
        <input
          type="range"
          min={60}
          max={160}
          value={value.radius}
          onChange={(event) => onChange({ ...value, radius: Number(event.target.value) })}
        />
      </label>
      <label className="field">
        Dead zone radius
        <input
          type="range"
          min={16}
          max={80}
          value={value.deadZoneRadius}
          onChange={(event) =>
            onChange({ ...value, deadZoneRadius: Number(event.target.value) })
          }
        />
      </label>
      <label className="field">
        Secondary reveal distance
        <input
          type="range"
          min={90}
          max={220}
          value={value.secondaryDistance}
          onChange={(event) =>
            onChange({ ...value, secondaryDistance: Number(event.target.value) })
          }
        />
      </label>
    </div>
  );
}
