import type { ExtensionSettings, WheelItem, WheelSelection } from "./wheel-types";
import { selectionKey } from "./wheel-geometry";

export interface WheelViewState {
  open: boolean;
  center: { x: number; y: number };
  items: WheelItem[];
  settings: ExtensionSettings | null;
  selection: WheelSelection;
  resolvedTheme: "dark" | "light";
}

const idleSelection: WheelSelection = {
  primaryIndex: null,
  secondaryIndex: null,
  zone: "dead",
  item: null,
};

const initialState: WheelViewState = {
  open: false,
  center: { x: 0, y: 0 },
  items: [],
  settings: null,
  selection: idleSelection,
  resolvedTheme: "dark",
};

export class WheelStore {
  private state: WheelViewState = initialState;
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): WheelViewState => this.state;

  set(partial: Partial<WheelViewState>): void {
    const next = { ...this.state, ...partial };
    if (
      partial.selection &&
      selectionKey(partial.selection) === selectionKey(this.state.selection)
    ) {
      next.selection = this.state.selection;
    }
    if (
      next.open === this.state.open &&
      next.center === this.state.center &&
      next.items === this.state.items &&
      next.settings === this.state.settings &&
      next.selection === this.state.selection &&
      next.resolvedTheme === this.state.resolvedTheme
    ) {
      return;
    }
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }

  close(): void {
    this.set({ open: false, selection: idleSelection });
  }
}

export const idleWheelSelection = idleSelection;
