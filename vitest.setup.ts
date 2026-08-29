import "@testing-library/jest-dom/vitest";

// `cmdk` (dipakai `Command`) memanggil `ResizeObserver` saat mount untuk
// mengukur tinggi list -- jsdom tak mengimplementasikannya. Stub minimal:
// cukup terdaftar sebagai constructor valid, callback resize tak perlu
// benar-benar jalan di lingkungan test.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// `cmdk` juga memanggil `Element.prototype.scrollIntoView` untuk
// mengarahkan ke item aktif -- jsdom tak mengimplementasikannya sama sekali.
// Guard `typeof Element` dulu: file yang environment-nya "node" (mis. test
// route API) tak punya global `Element` sama sekali.
if (typeof Element !== "undefined" && typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = () => {};
}
