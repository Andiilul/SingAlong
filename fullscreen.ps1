Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class ForegroundWindow {
    [StructLayout(LayoutKind.Sequential)]
    private struct Rect {
        public int Left, Top, Right, Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MonitorInfo {
        public int Size;
        public Rect Monitor, WorkArea;
        public uint Flags;
    }

    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern IntPtr GetDesktopWindow();
    [DllImport("user32.dll")] private static extern IntPtr GetShellWindow();
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("user32.dll")] private static extern IntPtr MonitorFromWindow(IntPtr window, uint flags);
    [DllImport("user32.dll", EntryPoint = "GetMonitorInfoW")]
    private static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr window, out Rect bounds);
    [DllImport("user32.dll")] private static extern bool IsZoomed(IntPtr window);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongW")]
    private static extern int GetWindowLong(IntPtr window, int index);
    [DllImport("user32.dll")] private static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);

    public static bool IsFullscreen(uint singAlongProcessId) {
        IntPtr window = GetForegroundWindow();
        if (window == IntPtr.Zero || window == GetDesktopWindow() || window == GetShellWindow()) return false;
        uint processId;
        GetWindowThreadProcessId(window, out processId);
        if (processId == singAlongProcessId) return false;

        const int WindowStyle = -16;
        const int Caption = 0x00C00000;
        if (IsZoomed(window) && (GetWindowLong(window, WindowStyle) & Caption) == Caption) return false;

        // Use the same physical coordinate space for the window and its monitor.
        IntPtr previousDpiContext = SetThreadDpiAwarenessContext(new IntPtr(-4));
        try {
            IntPtr monitor = MonitorFromWindow(window, 2);
            var info = new MonitorInfo { Size = Marshal.SizeOf(typeof(MonitorInfo)) };
            Rect bounds;
            if (!GetMonitorInfo(monitor, ref info) || !GetWindowRect(window, out bounds)) return false;

            const int tolerance = 2;
            return Math.Abs(bounds.Left - info.Monitor.Left) <= tolerance &&
                   Math.Abs(bounds.Top - info.Monitor.Top) <= tolerance &&
                   Math.Abs(bounds.Right - info.Monitor.Right) <= tolerance &&
                   Math.Abs(bounds.Bottom - info.Monitor.Bottom) <= tolerance;
        } finally {
            if (previousDpiContext != IntPtr.Zero) SetThreadDpiAwarenessContext(previousDpiContext);
        }
    }
}
'@
