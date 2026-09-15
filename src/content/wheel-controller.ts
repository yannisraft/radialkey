import wheelCss from "../styles/wheel.css?inline";
import { appearanceVars, detectDocumentTheme, resolveTheme } from "../wheel/appearance";
import { clampCenter, resolveSelection, selectionKey } from "../wheel/wheel-geometry";
import { ensureHost, setHostBlocking, type ExtensionHost } from "../wheel/host";
import { bindWheelView } from "../wheel/mount-wheel";
import { idleWheelSelection, WheelStore } from "../wheel/wheel-state";
import type {
  CaretSnapshot,
  ComposerPort,
  ExtensionSettings,
  GestureSample,
  Point,
  WheelItem,
} from "../wheel/wheel-types";
import { GestureTracker, isDebugToggle, triggerMatches } from "./gesture-tracker";

export interface WheelControllerOptions {
  port: ComposerPort;
  hostParent?: ParentNode;
  getSettings: () => ExtensionSettings;
  onPreviewSelection?: (label: string) => void;
}

export class WheelController {
  private readonly store = new WheelStore();
  private readonly tracker = new GestureTracker();
  private readonly port: ComposerPort;
  private readonly getSettings: () => ExtensionSettings;
  private readonly onPreviewSelection?: (label: string) => void;
  private host: ExtensionHost | null = null;
  private unbindView: (() => void) | null = null;
  private readonly hostParent: ParentNode;
  private open = false;
  private delayTimer = 0;
  private caret: CaretSnapshot | null = null;
  private composer: HTMLElement | null = null;
  private unwatchComposer: (() => void) | null = null;
  private lastSelectionKey = "";
  private lastGestureAt = 0;
  private attached = false;
  private pinned = false;

  constructor(options: WheelControllerOptions) {
    this.port = options.port;
    this.getSettings = options.getSettings;
    this.onPreviewSelection = options.onPreviewSelection;
    this.hostParent = options.hostParent ?? document.documentElement;
  }

  private ensureUi(): void {
    if (this.host && this.unbindView) return;
    this.host = ensureHost(this.hostParent);
    if (!this.host.root.querySelector("style[data-rx]")) {
      const style = document.createElement("style");
      style.dataset.rx = "wheel";
      style.textContent = wheelCss;
      this.host.root.prepend(style);
    }
    this.unbindView = bindWheelView(this.host.mount, this.store, () => this.cancel());
  }

  attach(target: EventTarget = window): () => void {
    if (this.attached) return () => this.detach();
    this.attached = true;
    target.addEventListener("mousedown", this.onMouseDown, true);
    target.addEventListener("pointerdown", this.onPointerDown, true);
    target.addEventListener("contextmenu", this.onContextMenu, true);
    target.addEventListener("auxclick", this.onAuxClick, true);
    window.addEventListener("mouseup", this.onMouseUp, true);
    window.addEventListener("pointerup", this.onPointerUp, true);
    window.addEventListener("keydown", this.onKeyDown, true);
    window.addEventListener("blur", this.onWindowBlur, true);
    return () => this.detach(target);
  }

  detach(target: EventTarget = window): void {
    this.attached = false;
    target.removeEventListener("mousedown", this.onMouseDown, true);
    target.removeEventListener("pointerdown", this.onPointerDown, true);
    target.removeEventListener("contextmenu", this.onContextMenu, true);
    target.removeEventListener("auxclick", this.onAuxClick, true);
    window.removeEventListener("mouseup", this.onMouseUp, true);
    window.removeEventListener("pointerup", this.onPointerUp, true);
    window.removeEventListener("keydown", this.onKeyDown, true);
    window.removeEventListener("blur", this.onWindowBlur, true);
    this.cancel();
  }

  private settings(): ExtensionSettings {
    return this.getSettings();
  }

  private shouldHandle(event: MouseEvent): HTMLElement | null {
    const settings = this.settings();
    if (!triggerMatches(event, settings.activation.trigger)) return null;
    return this.port.resolveComposer(event);
  }

  private onMouseDown = (event: Event): void => {
    if (!(event instanceof MouseEvent)) return;
    if (this.open && event.button === 0) {
      const path = event.composedPath();
      const close = path.some(
        (node) => node instanceof HTMLElement && node.classList.contains("rx-close"),
      );
      if (close) this.cancel();
      else if (!this.pinned) this.cancel();
      return;
    }
    if (this.open || this.delayTimer) return;
    const composer = this.shouldHandle(event);
    if (!composer) return;
    this.begin(event, composer);
  };

  private onPointerDown = (event: Event): void => {
    if (!(event instanceof PointerEvent)) return;
    if (this.open && event.button === 0) return;
    const composer = this.shouldHandle(event);
    if (!composer) return;
    // Do not preventDefault here: canceling pointerdown suppresses mousedown
    // and can prevent the wheel from opening in Chrome.
    this.begin(event, composer);
  };

  private onContextMenu = (event: Event): void => {
    if (!(event instanceof MouseEvent)) return;
    const composer = this.shouldHandle(event);
    const recent = Date.now() - this.lastGestureAt < 500;
    if (this.open || composer || recent) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  private onAuxClick = (event: Event): void => {
    if (!(event instanceof MouseEvent)) return;
    if (this.open || this.shouldHandle(event) || Date.now() - this.lastGestureAt < 500) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  private onMouseUp = (event: Event): void => {
    if (!(event instanceof MouseEvent) || event.button !== 2) return;
    if (!this.open && this.delayTimer) {
      window.clearTimeout(this.delayTimer);
      this.delayTimer = 0;
      return;
    }
    if (!this.open) return;
    if (this.pinned) return;
    this.commit();
  };

  private onPointerUp = (event: Event): void => {
    if (!(event instanceof PointerEvent) || event.button !== 2) return;
    if (!this.open || this.pinned) return;
    this.commit();
  };

  private onKeyDown = (event: Event): void => {
    if (!(event instanceof KeyboardEvent)) return;
    if (isDebugToggle(event)) {
      event.preventDefault();
      event.stopPropagation();
      this.togglePinned();
      return;
    }
    if (event.key === "Escape" && (this.open || this.delayTimer)) {
      event.preventDefault();
      this.cancel();
    }
  };

  private onWindowBlur = (): void => {
    if (this.pinned) return;
    if (this.open) this.cancel();
  };

  private begin(event: MouseEvent, composer: HTMLElement): void {
    if (this.open || this.delayTimer) return;
    this.lastGestureAt = Date.now();
    this.pinned = false;
    this.composer = composer;
    this.caret = this.port.saveCaret(composer);
    const settings = this.settings();
    const start = () => {
      const settings = this.settings();
      const half = this.wheelHalf(settings);
      const center = clampCenter({ x: event.clientX, y: event.clientY }, half, {
        width: window.innerWidth,
        height: window.innerHeight,
      });
      this.openWheelAt(center, composer, settings);
    };
    if (settings.activation.delayMs > 0) {
      this.delayTimer = window.setTimeout(start, settings.activation.delayMs);
    } else {
      start();
    }
  }

  private wheelHalf(settings: ExtensionSettings): number {
    return Math.max(settings.wheel.secondaryDistance + 56, settings.wheel.radius + 48);
  }

  private togglePinned(): void {
    if (this.pinned) {
      this.cancel();
      return;
    }
    if (this.open) {
      this.pinned = true;
      return;
    }
    this.cancelPending();
    const settings = this.settings();
    const composer = this.port.getActiveComposer();
    this.composer = composer;
    this.caret = composer ? this.port.saveCaret(composer) : null;
    this.pinned = true;
    const half = this.wheelHalf(settings);
    const center = clampCenter(
      { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      half,
      { width: window.innerWidth, height: window.innerHeight },
    );
    this.openWheelAt(center, composer, settings);
  }

  private openWheelAt(
    center: Point,
    composer: HTMLElement | null,
    settings: ExtensionSettings,
  ): void {
    this.ensureUi();
    this.tracker.setCenter(center);
    this.open = true;
    this.lastSelectionKey = "";
    const theme = resolveTheme(settings.appearance.theme, detectDocumentTheme);
    this.store.set({
      open: true,
      center,
      items: this.activeItems(settings),
      settings,
      selection: idleWheelSelection,
      resolvedTheme: theme,
    });
    this.applyHostTheme(settings, theme);
    this.tracker.start(center, (sample) => this.onSample(sample));
    if (this.host) setHostBlocking(this.host, true);
    if (composer) {
      this.unwatchComposer = this.port.subscribeComposerGone(composer, () => {
        if (!this.pinned) this.cancel();
      });
      composer.addEventListener("blur", this.onComposerBlur, true);
    }
    this.onPreviewSelection?.("None");
  }

  private activeItems(settings: ExtensionSettings): WheelItem[] {
    const profile =
      settings.profiles.find((item) => item.id === settings.activeProfileId) ??
      settings.profiles[0];
    return profile?.items ?? [];
  }

  private onSample(sample: GestureSample): void {
    if (!this.open) return;
    const settings = this.settings();
    const items = this.activeItems(settings);
    const prev = this.store.getSnapshot().selection;
    const lock =
      prev.primaryIndex !== null && (prev.zone === "primary" || prev.zone === "secondary")
        ? prev.primaryIndex
        : null;
    const selection = resolveSelection(
      sample.angle,
      sample.distance,
      items,
      settings.wheel,
      lock,
    );
    const key = selectionKey(selection);
    if (key === this.lastSelectionKey) return;
    this.lastSelectionKey = key;
    this.store.set({ selection, items, settings });
    const primary =
      selection.primaryIndex !== null ? items[selection.primaryIndex] : undefined;
    const label =
      selection.item && primary
        ? selection.zone === "secondary" && selection.item.id !== primary.id
          ? `${primary.label} → ${selection.item.label}`
          : primary.label
        : "None";
    this.onPreviewSelection?.(label);
  }

  private commit(): void {
    if (!this.open) return;
    const selection = this.store.getSnapshot().selection;
    const item = selection.item;
    const snapshot = this.caret;
    this.hide();
    if (!item || !snapshot || selection.zone === "dead" || selection.zone === "outside") {
      return;
    }
    if (item.action.type === "insert-text") {
      this.port.insertAtCaret(snapshot, item.action.value);
    }
  }

  cancel(): void {
    this.cancelPending();
    if (this.open) this.hide();
  }

  private hide(): void {
    this.open = false;
    this.pinned = false;
    this.tracker.stop();
    this.store.close();
    this.caret = null;
    if (this.composer) {
      this.composer.removeEventListener("blur", this.onComposerBlur, true);
    }
    this.unwatchComposer?.();
    this.unwatchComposer = null;
    this.composer = null;
    this.lastGestureAt = Date.now();
    if (this.host) setHostBlocking(this.host, false);
  }

  private cancelPending(): void {
    if (this.delayTimer) {
      window.clearTimeout(this.delayTimer);
      this.delayTimer = 0;
    }
  }

  private onComposerBlur = (): void => {
    window.setTimeout(() => {
      if (!this.open || this.pinned) return;
      const active = this.port.getActiveComposer();
      if (active !== this.composer) this.cancel();
    }, 0);
  };

  private applyHostTheme(settings: ExtensionSettings, theme: "dark" | "light"): void {
    const vars = appearanceVars(settings.appearance, theme);
    const mount = this.host?.mount;
    if (!mount) return;
    Object.entries(vars).forEach(([key, value]) => mount.style.setProperty(key, value));
  }
}
