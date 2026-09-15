import { useEffect, useRef, useState } from "react";
import { WheelController } from "../../content/wheel-controller";
import { createGenericComposerPort } from "../../wheel/generic-composer";
import type { ExtensionSettings } from "../../wheel/wheel-types";

interface Props {
  settings: ExtensionSettings;
}

export function PreviewPlayground({ settings }: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef(settings);
  const [selected, setSelected] = useState("None");
  const [text, setText] = useState(
    "Write here, then use your trigger to open the wheel.",
  );

  settingsRef.current = settings;

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const controller = new WheelController({
      port: createGenericComposerPort(area),
      hostParent: document.documentElement,
      getSettings: () => settingsRef.current,
      onPreviewSelection: setSelected,
    });
    const detach = controller.attach(area);
    return () => {
      detach();
    };
  }, []);

  const triggerLabel =
    settings.activation.trigger === "ctrl-right"
      ? "Ctrl + Right Click"
      : settings.activation.trigger === "alt-right"
        ? "Alt + Right Click"
        : "Shift + Right Click";

  return (
    <div className="playground" ref={areaRef}>
      <p className="hint">
        Preview uses the same radial engine as X. Focus the composer and press{" "}
        {triggerLabel}. Shift+V pins the wheel so you can inspect it.
      </p>
      <textarea
        aria-label="Preview composer"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="selected">
        Selected: <strong>{selected}</strong>
      </div>
    </div>
  );
}
