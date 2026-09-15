export type TriggerType = "ctrl-right" | "alt-right" | "shift-right";

export type WheelAction = {
  type: "insert-text";
  value: string;
};

export interface WheelItem {
  id: string;
  label: string;
  icon?: string;
  action: WheelAction;
  children?: WheelItem[];
}

export interface WheelProfile {
  id: string;
  name: string;
  items: WheelItem[];
}

export type SegmentCount = 4 | 6 | 8;
export type ThemeMode = "dark" | "light" | "auto";
export type AnimationMode = "full" | "reduced" | "off";

export interface ActivationSettings {
  trigger: TriggerType;
  delayMs: number;
  onlyWhileWriting: boolean;
}

export interface WheelLayoutSettings {
  segmentCount: SegmentCount;
  radius: number;
  deadZoneRadius: number;
  secondaryDistance: number;
  sensitivity: number;
}

export interface AppearanceSettings {
  theme: ThemeMode;
  transparency: number;
  blur: number;
  animations: AnimationMode;
  animationSpeed: number;
  scale: number;
}

export interface ExtensionSettings {
  version: number;
  activation: ActivationSettings;
  wheel: WheelLayoutSettings;
  appearance: AppearanceSettings;
  activeProfileId: string;
  profiles: WheelProfile[];
}

export type SelectionZone = "dead" | "primary" | "secondary" | "outside";

export interface WheelSelection {
  primaryIndex: number | null;
  secondaryIndex: number | null;
  zone: SelectionZone;
  item: WheelItem | null;
}

export interface Point {
  x: number;
  y: number;
}

export interface GestureSample {
  angle: number;
  distance: number;
  clientX: number;
  clientY: number;
}

export interface CaretSnapshot {
  element: HTMLElement;
  kind: "value" | "contenteditable";
  start: number;
  end: number;
  range: Range | null;
}

export interface ComposerPort {
  resolveComposer(source: Event | EventTarget | null): HTMLElement | null;
  getActiveComposer(): HTMLElement | null;
  saveCaret(element: HTMLElement): CaretSnapshot | null;
  insertAtCaret(snapshot: CaretSnapshot, text: string): boolean;
  subscribeComposerGone(element: HTMLElement, onGone: () => void): () => void;
}

export const SETTINGS_VERSION = 4;
