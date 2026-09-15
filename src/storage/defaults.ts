import {
  SETTINGS_VERSION,
  type ExtensionSettings,
  type WheelItem,
  type WheelProfile,
} from "../wheel/wheel-types";

function insert(value: string, id: string, label?: string): WheelItem {
  return {
    id,
    label: label ?? value,
    icon: value,
    action: { type: "insert-text", value },
  };
}

function category(
  id: string,
  label: string,
  icon: string,
  children: string[],
): WheelItem {
  return {
    id,
    label,
    icon,
    action: { type: "insert-text", value: icon },
    children: children.map((value, index) => insert(value, `${id}-${index}`)),
  };
}

export const DEFAULT_PROFILE_ID = "default";

export function createDefaultWheelItems(): WheelItem[] {
  return [
    category("funny", "Funny", "😂", ["🤣", "😭", "💀", "😆", "😅", "🤭"]),
    category("love", "Love", "❤️", ["😊", "🥰", "😍", "💕", "💜", "💙"]),
    category("hype", "Hype", "🔥", ["🚀", "💯", "⚡", "🤩", "💥", "🌟"]),
    category("agree", "Agree", "👍", ["👏", "🙌", "✅", "💪", "👌", "🤝"]),
    category("emphasis", "Celebration", "✨", ["🎉", "🌅", "☀️", "🌟", "💫", "🥳"]),
    category("interesting", "Interesting", "👀", ["🤔", "🧐", "😮", "😱", "💡", "👇"]),
    category("thanks", "Thanks", "🙏", ["🤝", "👏", "❤️", "🙌", "😊", "☺️"]),
    category("playful", "Playful", "😏", ["😎", "🙃", "😉", "😜", "🤦", "🤷"]),
  ];
}

export function createDefaultProfile(): WheelProfile {
  return {
    id: DEFAULT_PROFILE_ID,
    name: "Default",
    items: createDefaultWheelItems(),
  };
}

export function createDefaultSettings(): ExtensionSettings {
  return {
    version: SETTINGS_VERSION,
    activation: {
      trigger: "ctrl-right",
      delayMs: 0,
      onlyWhileWriting: true,
    },
    wheel: {
      segmentCount: 8,
      radius: 124,
      deadZoneRadius: 44,
      secondaryDistance: 168,
      sensitivity: 1,
    },
    appearance: {
      theme: "dark",
      transparency: 0.72,
      blur: 14,
      animations: "full",
      animationSpeed: 1,
      scale: 1,
    },
    activeProfileId: DEFAULT_PROFILE_ID,
    profiles: [createDefaultProfile()],
  };
}
