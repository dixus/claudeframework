import "@testing-library/jest-dom";

// Polyfill ResizeObserver for Radix UI components in jsdom
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Polyfill pointer capture for Radix UI (only in jsdom environments)
if (
  typeof Element !== "undefined" &&
  typeof Element.prototype.hasPointerCapture === "undefined"
) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
