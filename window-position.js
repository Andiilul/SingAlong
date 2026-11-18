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

module.exports = { moveWindow };
