import type { GestureSample, Point, TriggerType } from "../wheel/wheel-types";

export function triggerMatches(event: MouseEvent, trigger: TriggerType): boolean {
  const isRightButton =
    event.button === 2 || event.type === "contextmenu" || event.which === 3;
  if (!isRightButton) return false;
  if (trigger === "ctrl-right") return event.ctrlKey && !event.altKey && !event.metaKey;
  if (trigger === "alt-right") return event.altKey && !event.ctrlKey && !event.metaKey;
  return event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
}

export function isDebugToggle(event: KeyboardEvent): boolean {
  return (
    event.code === "KeyV" &&
    event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.metaKey &&
    !event.repeat
  );
}

export class GestureTracker {
  private center: Point = { x: 0, y: 0 };
  private raf = 0;
  private pending: GestureSample | null = null;
  private active = false;
  private onSample: ((sample: GestureSample) => void) | null = null;

  start(center: Point, onSample: (sample: GestureSample) => void): void {
    this.stop();
    this.center = center;
    this.onSample = onSample;
    this.active = true;
    window.addEventListener("pointermove", this.handleMove, true);
  }

  sampleFromEvent(event: PointerEvent | MouseEvent): GestureSample {
    const dx = event.clientX - this.center.x;
    const dy = event.clientY - this.center.y;
    return {
      angle: Math.atan2(dy, dx),
      distance: Math.hypot(dx, dy),
      clientX: event.clientX,
      clientY: event.clientY,
    };
  }

  getCenter(): Point {
    return this.center;
  }

  setCenter(center: Point): void {
    this.center = center;
  }

  stop(): void {
    this.active = false;
    this.onSample = null;
    this.pending = null;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    window.removeEventListener("pointermove", this.handleMove, true);
  }

  private handleMove = (event: PointerEvent): void => {
    if (!this.active) return;
    this.pending = this.sampleFromEvent(event);
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      if (this.pending && this.onSample) this.onSample(this.pending);
    });
  };
}
