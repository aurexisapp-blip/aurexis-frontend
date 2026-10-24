// iOS app palette and type scale (see the redesign's Foundations board).
// Native-only: the website never imports this.

export const NATIVE_FONT = "-apple-system, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif";

export const NATIVE_PALETTE = {
  dark: {
    bg: "#0A0C0B",
    surface: "#141716",
    raised: "#1C201E",
    text: "#F3F5F4",
    textSec: "#A2AAA6",
    hairline: "rgba(255,255,255,0.08)",
    accent: "#3EE0A3",
    accentInk: "#04110C",
    primaryBg: "#F3F5F4",
    primaryInk: "#0A0C0B",
    danger: "#F87171",
    glass: "rgba(28,32,30,0.72)",
    shadow: "0 24px 50px rgba(0,0,0,0.5)",
  },
  light: {
    bg: "#F4F5F3",
    surface: "#FFFFFF",
    raised: "#E9ECEA",
    text: "#0A0C0B",
    textSec: "#5B635F",
    hairline: "rgba(0,0,0,0.08)",
    accent: "#0A7A54",
    accentInk: "#FFFFFF",
    primaryBg: "#0A0C0B",
    primaryInk: "#FFFFFF",
    danger: "#C53030",
    glass: "rgba(255,255,255,0.78)",
    shadow: "0 1px 2px rgba(0,0,0,0.05), 0 18px 40px rgba(10,40,28,0.10)",
  },
};

// Five sizes, matching Apple's own hierarchy.
export const NATIVE_TYPE = {
  largeTitle: { fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.12 },
  title: { fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" },
  body: { fontSize: 17, lineHeight: 1.5 },
  secondary: { fontSize: 15, lineHeight: 1.5 },
  footnote: { fontSize: 13, lineHeight: 1.5 },
};

// iOS-like spring: settles without bouncing.
export const NATIVE_SPRING = { type: "spring", stiffness: 380, damping: 36, mass: 1 };

export function systemPrefersLight() {
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches;
  } catch {
    return false;
  }
}
