import { WheelController } from "./wheel-controller";
import { createXAdapter } from "./x-adapter";
import { loadSettings, subscribeSettings } from "../storage/settings";
import type { ExtensionSettings } from "../wheel/wheel-types";

let settingsCache: ExtensionSettings | null = null;

async function boot(): Promise<void> {
  settingsCache = await loadSettings();
  const adapter = createXAdapter(
    () => settingsCache?.activation.onlyWhileWriting ?? true,
  );
  const controller = new WheelController({
    port: adapter,
    getSettings: () => settingsCache!,
  });
  controller.attach(window);
  subscribeSettings((next) => {
    settingsCache = next;
  });
  console.info("[RadialKey] ready");
}

void boot().catch((error: unknown) => {
  console.error("[RadialKey] failed to start", error);
});
