const { screen } = require('electron');

let setWindowPos;
if (process.platform === 'win32') {
  const koffi = require('koffi');
  setWindowPos = koffi.load('user32.dll').func(
    'int __stdcall SetWindowPos(void *window, void *insertAfter, int x, int y, int width, int height, uint32_t flags)',
  );
}

function moveWindow(window, x, y) {
  if (!setWindowPos) {
    window.setPosition(x, y);
    return;
  }

  const handle = window.getNativeWindowHandle();
  const hwnd = handle.length === 8 ? handle.readBigUInt64LE() : BigInt(handle.readUInt32LE());
  const point = screen.dipToScreenPoint({ x, y });
  // SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE. Preserve the physical window size.
  if (!setWindowPos(hwnd, null, point.x, point.y, 0, 0, 0x0001 | 0x0004 | 0x0010)) {
    throw new Error('Windows could not move the overlay.');
  }
}

function resizeWindow(window, width, height) {
  if (!setWindowPos) {
    window.setSize(width, height);
    return;
  }
  const handle = window.getNativeWindowHandle();
  const hwnd = handle.length === 8 ? handle.readBigUInt64LE() : BigInt(handle.readUInt32LE());
  const rect = screen.dipToScreenRect(window, { ...window.getBounds(), width, height });
  // SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE: intentional resize only.
  if (!setWindowPos(hwnd, null, 0, 0, rect.width, rect.height, 0x0002 | 0x0004 | 0x0010)) {
    throw new Error('Windows could not resize the overlay.');
  }
}

module.exports = { moveWindow, resizeWindow };
