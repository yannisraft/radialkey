import type { AppearanceSettings, ThemeMode } from "./wheel-types";

export function resolveTheme(
  mode: ThemeMode,
  detect: () => "dark" | "light",
): "dark" | "light" {
  if (mode === "auto") return detect();
  return mode;
}

export function detectDocumentTheme(): "dark" | "light" {
  const target = document.body ?? document.documentElement;
  const bg = getComputedStyle(target).backgroundColor;
  const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const r = Number(match[1]);
    const g = Number(match[2]);
    const b = Number(match[3]);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.65 ? "light" : "dark";
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function appearanceVars(
  appearance: AppearanceSettings,
  theme: "dark" | "light",
): Record<string, string> {
  const alpha = appearance.transparency;
  const dark = theme === "dark";
  return {
    "--rx-bg": dark ? `rgba(14, 20, 16, ${alpha})` : `rgba(246, 246, 248, ${alpha})`,
    "--rx-wedge": dark ? "rgba(45, 142, 90, 0.14)" : "rgba(45, 142, 90, 0.08)",
    "--rx-wedge-active": "#3c413e61",
    "--rx-border": dark ? "rgba(45, 142, 90, 0.42)" : "rgba(45, 142, 90, 0.28)",
    "--rx-text": dark ? "#f4f4f5" : "#18181b",
    "--rx-muted": dark ? "#b7b7c2" : "#52525b",
    "--rx-glow": "#424f4880",
    "--rx-cancel": dark ? "rgba(8, 14, 10, 0.82)" : "rgba(0, 0, 0, 0.08)",
    "--rx-blur": `${appearance.blur}px`,
    "--rx-scale": String(appearance.scale),
    "--rx-anim-ms": `${Math.round(120 / appearance.animationSpeed)}ms`,
    "--rx-anim-fast": `${Math.round(90 / appearance.animationSpeed)}ms`,
  };
}

export function motionDuration(appearance: AppearanceSettings): number {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (appearance.animations === "off" || reduced) return 0;
  const base = appearance.animations === "reduced" ? 70 : 130;
  return Math.round(base / appearance.animationSpeed);
}
