import { createDefaultSettings, createDefaultWheelItems, DEFAULT_PROFILE_ID } from "./defaults";
import {
  SETTINGS_VERSION,
  type ExtensionSettings,
  type WheelItem,
  type WheelProfile,
} from "../wheel/wheel-types";

const SYNC_KEY = "radialx.sync";
const LOCAL_KEY = "radialx.local";

interface SyncBlob {
  version: number;
  activation: ExtensionSettings["activation"];
  wheel: ExtensionSettings["wheel"];
  appearance: ExtensionSettings["appearance"];
  activeProfileId: string;
}

interface LocalBlob {
  version: number;
  profiles: WheelProfile[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function migrateSettings(raw: unknown): ExtensionSettings {
  const defaults = createDefaultSettings();
  if (!isRecord(raw)) return defaults;

  const version = typeof raw.version === "number" ? raw.version : 0;
  if (version > SETTINGS_VERSION) return defaults;

  const activation = isRecord(raw.activation) ? raw.activation : {};
  const wheel = isRecord(raw.wheel) ? raw.wheel : {};
  const appearance = isRecord(raw.appearance) ? raw.appearance : {};

  const profiles = Array.isArray(raw.profiles)
    ? (raw.profiles as WheelProfile[])
    : defaults.profiles;

  const segmentCount = wheel.segmentCount;
  const validSegments =
    segmentCount === 4 || segmentCount === 6 || segmentCount === 8
      ? segmentCount
      : defaults.wheel.segmentCount;

  const theme = appearance.theme;
  const validTheme =
    theme === "dark" || theme === "light" || theme === "auto"
      ? theme
      : defaults.appearance.theme;

  const animations = appearance.animations;
  const validAnimations =
    animations === "full" || animations === "reduced" || animations === "off"
      ? animations
      : defaults.appearance.animations;

  const trigger = activation.trigger;
  const validTrigger =
    trigger === "ctrl-right" || trigger === "alt-right" || trigger === "shift-right"
      ? trigger
      : defaults.activation.trigger;

  const storedRadius = Number(wheel.radius);
  const storedDead = Number(wheel.deadZoneRadius);
  const storedSecondary = Number(wheel.secondaryDistance);
  const stillOldDefaultSize =
    version < 2 && storedRadius === 100 && storedDead === 35 && storedSecondary === 135;

  const nextSegments =
    version < 3 && validSegments === 6 ? defaults.wheel.segmentCount : validSegments;

  const nextProfiles =
    version < 4 ? migrateDefaultWheelContent(profiles) : profiles;

  return {
    version: SETTINGS_VERSION,
    activation: {
      trigger: validTrigger,
      delayMs: Math.max(0, Number(activation.delayMs) || 0),
      onlyWhileWriting:
        typeof activation.onlyWhileWriting === "boolean"
          ? activation.onlyWhileWriting
          : defaults.activation.onlyWhileWriting,
    },
    wheel: {
      segmentCount: nextSegments,
      radius: stillOldDefaultSize
        ? defaults.wheel.radius
        : clampNumber(wheel.radius, 60, 160, defaults.wheel.radius),
      deadZoneRadius: stillOldDefaultSize
        ? defaults.wheel.deadZoneRadius
        : clampNumber(
            wheel.deadZoneRadius,
            16,
            80,
            defaults.wheel.deadZoneRadius,
          ),
      secondaryDistance: stillOldDefaultSize
        ? defaults.wheel.secondaryDistance
        : clampNumber(
            wheel.secondaryDistance,
            90,
            220,
            defaults.wheel.secondaryDistance,
          ),
      sensitivity: clampNumber(wheel.sensitivity, 0.5, 2, defaults.wheel.sensitivity),
    },
    appearance: {
      theme: validTheme,
      transparency: clampNumber(
        appearance.transparency,
        0.35,
        0.95,
        defaults.appearance.transparency,
      ),
      blur: clampNumber(appearance.blur, 0, 28, defaults.appearance.blur),
      animations: validAnimations,
      animationSpeed: clampNumber(
        appearance.animationSpeed,
        0.5,
        2,
        defaults.appearance.animationSpeed,
      ),
      scale: clampNumber(appearance.scale, 0.75, 1.4, defaults.appearance.scale),
    },
    activeProfileId:
      typeof raw.activeProfileId === "string"
        ? raw.activeProfileId
        : defaults.activeProfileId,
    profiles: nextProfiles.length > 0 ? nextProfiles : defaults.profiles,
  };
}

function isLegacyDefaultWheel(items: WheelItem[]): boolean {
  const ids = items.map((item) => item.id).join(",");
  return (
    ids === "funny,love,hype,positive,interesting,snippets" ||
    ids === "funny,love,hype,agree,emphasis,interesting,thanks,playful"
  );
}

function migrateDefaultWheelContent(profiles: WheelProfile[]): WheelProfile[] {
  return profiles.map((profile) => {
    if (profile.id !== DEFAULT_PROFILE_ID || !isLegacyDefaultWheel(profile.items)) {
      return profile;
    }
    return { ...profile, items: createDefaultWheelItems() };
  });
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function splitSettings(settings: ExtensionSettings): {
  sync: SyncBlob;
  local: LocalBlob;
} {
  return {
    sync: {
      version: settings.version,
      activation: settings.activation,
      wheel: settings.wheel,
      appearance: settings.appearance,
      activeProfileId: settings.activeProfileId,
    },
    local: {
      version: settings.version,
      profiles: settings.profiles,
    },
  };
}

function storageArea(name: "sync" | "local"): chrome.storage.StorageArea | null {
  try {
    const area = chrome?.storage?.[name];
    if (!area || typeof area.get !== "function") return null;
    return area;
  } catch {
    return null;
  }
}

async function areaGet(
  area: chrome.storage.StorageArea | null,
  key: string,
): Promise<Record<string, unknown>> {
  if (!area) return {};
  return (await area.get(key)) as Record<string, unknown>;
}

async function areaSet(
  area: chrome.storage.StorageArea | null,
  value: Record<string, unknown>,
): Promise<void> {
  if (!area) return;
  await area.set(value);
}

export async function loadSettings(): Promise<ExtensionSettings> {
  const defaults = createDefaultSettings();
  try {
    const [syncResult, localResult] = await Promise.all([
      areaGet(storageArea("sync"), SYNC_KEY),
      areaGet(storageArea("local"), LOCAL_KEY),
    ]);
    const sync = syncResult[SYNC_KEY];
    const local = localResult[LOCAL_KEY];
    const merged = {
      ...defaults,
      ...(isRecord(sync) ? sync : {}),
      ...(isRecord(local) ? { profiles: (local as unknown as LocalBlob).profiles } : {}),
    };
    return migrateSettings(merged);
  } catch {
    return defaults;
  }
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  const next = migrateSettings(settings);
  const { sync, local } = splitSettings(next);
  await Promise.all([
    areaSet(storageArea("sync"), { [SYNC_KEY]: sync }),
    areaSet(storageArea("local"), { [LOCAL_KEY]: local }),
  ]);
}

export function subscribeSettings(
  listener: (settings: ExtensionSettings) => void,
): () => void {
  const api = chrome?.storage;
  if (!api?.onChanged) return () => undefined;
  const handler = (
    changes: { [key: string]: chrome.storage.StorageChange },
    area: string,
  ) => {
    if (area !== "sync" && area !== "local") return;
    if (!(SYNC_KEY in changes) && !(LOCAL_KEY in changes)) return;
    void loadSettings().then(listener);
  };
  api.onChanged.addListener(handler);
  return () => api.onChanged.removeListener(handler);
}

export function getActiveProfile(settings: ExtensionSettings): WheelProfile {
  return (
    settings.profiles.find((profile) => profile.id === settings.activeProfileId) ??
    settings.profiles[0] ??
    createDefaultSettings().profiles[0]!
  );
}
