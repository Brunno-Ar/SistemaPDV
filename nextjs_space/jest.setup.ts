import "@testing-library/jest-dom";

// Mocks globais para JSDOM para componentes Radix UI
// (guardado: testes de handler/API rodam em ambiente `node`, sem window)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  window.HTMLElement.prototype.releasePointerCapture = jest.fn();
  window.HTMLElement.prototype.hasPointerCapture = jest.fn();
}
