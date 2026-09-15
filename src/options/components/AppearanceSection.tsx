import type {
  AnimationMode,
  AppearanceSettings,
  ThemeMode,
} from "../../wheel/wheel-types";

interface Props {
  value: AppearanceSettings;
  onChange: (value: AppearanceSettings) => void;
}

export function AppearanceSection({ value, onChange }: Props) {
  return (
    <div className="grid two">
      <label className="field">
        Theme
        <select
          value={value.theme}
          onChange={(event) =>
            onChange({ ...value, theme: event.target.value as ThemeMode })
          }
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="auto">Follow X</option>
        </select>
      </label>
      <label className="field">
        Animation
        <select
          value={value.animations}
          onChange={(event) =>
            onChange({ ...value, animations: event.target.value as AnimationMode })
          }
        >
          <option value="full">Full</option>
          <option value="reduced">Reduced</option>
          <option value="off">Off</option>
        </select>
      </label>
      <label className="field">
        Transparency
        <input
          type="range"
          min={0.35}
          max={0.95}
          step={0.01}
          value={value.transparency}
          onChange={(event) =>
            onChange({ ...value, transparency: Number(event.target.value) })
          }
        />
      </label>
      <label className="field">
        Blur
        <input
          type="range"
          min={0}
          max={28}
          value={value.blur}
          onChange={(event) => onChange({ ...value, blur: Number(event.target.value) })}
        />
      </label>
      <label className="field">
        Animation speed
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.05}
          value={value.animationSpeed}
          onChange={(event) =>
            onChange({ ...value, animationSpeed: Number(event.target.value) })
          }
        />
      </label>
      <label className="field">
        Wheel scale
        <input
          type="range"
          min={0.75}
          max={1.4}
          step={0.01}
          value={value.scale}
          onChange={(event) => onChange({ ...value, scale: Number(event.target.value) })}
        />
      </label>
    </div>
  );
}
