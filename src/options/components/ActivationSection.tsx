import type { ActivationSettings, TriggerType } from "../../wheel/wheel-types";

interface Props {
  value: ActivationSettings;
  onChange: (value: ActivationSettings) => void;
}

export function ActivationSection({ value, onChange }: Props) {
  return (
    <div className="grid two">
      <label className="field">
        Trigger
        <select
          value={value.trigger}
          onChange={(event) =>
            onChange({ ...value, trigger: event.target.value as TriggerType })
          }
        >
          <option value="ctrl-right">Ctrl + Right Click</option>
          <option value="alt-right">Alt + Right Click</option>
          <option value="shift-right">Shift + Right Click</option>
        </select>
      </label>
      <label className="field">
        Activation delay (ms)
        <input
          type="number"
          min={0}
          value={value.delayMs}
          onChange={(event) =>
            onChange({ ...value, delayMs: Math.max(0, Number(event.target.value) || 0) })
          }
        />
      </label>
      <label className="toggle">
        <input
          type="checkbox"
          checked={value.onlyWhileWriting}
          onChange={(event) =>
            onChange({ ...value, onlyWhileWriting: event.target.checked })
          }
        />
        Only activate while writing
      </label>
    </div>
  );
}
