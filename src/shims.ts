// DOM shims

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeDummyElement() {
  return { getContext: () => null, style: {} } as any;
}

if (typeof self === 'undefined') {
  (globalThis as any).self = globalThis;
}

if (typeof window === 'undefined') {
  (globalThis as any).window = globalThis;
}

if (typeof navigator === 'undefined') {
  (globalThis as any).navigator = { userAgent: '' } as any;
}

if (typeof HTMLCanvasElement === 'undefined') {
  (globalThis as any).HTMLCanvasElement = class HTMLCanvasElement {};
}

if (typeof HTMLImageElement === 'undefined') {
  (globalThis as any).HTMLImageElement = class HTMLImageElement {};
}

if (typeof URL === 'undefined') {
  (globalThis as any).URL = class URL {
    constructor(public href: string) {}
    static createObjectURL() { return ''; }
    static revokeObjectURL() {}
  };
}

if (typeof Blob === 'undefined') {
  (globalThis as any).Blob = class Blob {
    constructor(public parts: unknown[], public options?: unknown) {}
  };
}

if (typeof createImageBitmap === 'undefined') {
  (globalThis as any).createImageBitmap = () => Promise.resolve({} as any);
}

if (typeof document === 'undefined') {
  (globalThis as any).document = {
    createElementNS(_ns: string, tag: string) {
      return makeDummyElement();
    },
    createElement(tag: string) {
      return makeDummyElement();
    },
  } as any;
}