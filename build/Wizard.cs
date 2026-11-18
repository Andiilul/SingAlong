using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Markup;
using System.Windows.Media.Animation;
using System.Windows.Media;
using System.Windows.Media.Imaging;

internal sealed class Wizard
{
    private readonly Window window;
    private readonly bool preview;
    private int page;
    private bool installing;
    private bool allowClose;
    private string installedPath;

    private T Find<T>(string name) where T : class
    {
        return (T)window.FindName(name);
    }

    private Wizard(bool preview)
    {
        this.preview = preview;
        using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("SingAlong.Wizard.xaml"))
        {
            window = (Window)XamlReader.Load(stream);
        }
        string version = Assembly.GetExecutingAssembly().GetName().Version.ToString(3);
        Find<TextBlock>("VersionText").Text = "Version " + version;
        Find<Button>("MinimizeButton").Click += delegate { window.WindowState = WindowState.Minimized; };
        Find<Button>("CloseButton").Click += delegate { RequestClose(); };
        Find<Button>("CancelButton").Click += delegate { RequestClose(); };
        Find<Button>("BackButton").Click += delegate { ShowPage(0); };
        Find<Button>("NextButton").Click += async delegate { await Next(); };
        Find<Button>("KeepSetupButton").Click += delegate { Find<Border>("CancelDialog").Visibility = Visibility.Collapsed; };
        Find<Button>("ExitSetupButton").Click += delegate { allowClose = true; window.Close(); };
        Find<Button>("GitHubButton").Click += delegate
        {
            try { Process.Start(new ProcessStartInfo("https://github.com/Andiilul") { UseShellExecute = true }); }
            catch (Exception error) { Find<TextBlock>("ErrorText").Text = error.Message; }
        };
        Find<Grid>("DragHeader").MouseLeftButtonDown += delegate
        {
            try { window.DragMove(); }
            catch (InvalidOperationException) { }
        };
        Find<RadioButton>("CurrentUserOption").Checked += delegate { UpdateDefaultPath(); };
        Find<RadioButton>("AllUsersOption").Checked += delegate { UpdateDefaultPath(); };
        window.Closing += delegate(object sender, CancelEventArgs args)
        {
            if (allowClose) return;
            args.Cancel = true;
            RequestClose();
        };
        window.PreviewKeyDown += delegate(object sender, KeyEventArgs args)
        {
            if (args.Key != Key.Escape) return;
            args.Handled = true;
            if (Find<Border>("CancelDialog").Visibility == Visibility.Visible)
                Find<Border>("CancelDialog").Visibility = Visibility.Collapsed;
            else
                RequestClose();
        };
        UpdateDefaultPath();
        ShowPage(0);
    }

    private bool AllUsers
    {
        get { return Find<RadioButton>("AllUsersOption").IsChecked == true; }
    }

    private void UpdateDefaultPath()
    {
        string folder = AllUsers
            ? Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles)
            : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs");
        Find<TextBox>("InstallPath").Text = Path.Combine(folder, "SingAlong");
        Find<TextBlock>("InstallHint").Text = AllUsers
            ? "Windows will ask for administrator permission."
            : "Installs for your Windows account.";
    }

    private void ShowPage(int index)
    {
        page = index;
        string[] pages = { "WelcomePage", "OptionsPage", "InstallingPage", "FinishPage" };
        for (int i = 0; i < pages.Length; i++)
            Find<StackPanel>(pages[i]).Visibility = i == index ? Visibility.Visible : Visibility.Collapsed;
        Find<Button>("BackButton").Visibility = index == 1 ? Visibility.Visible : Visibility.Collapsed;
        Find<Button>("CancelButton").Visibility = index < 2 ? Visibility.Visible : Visibility.Collapsed;
        Find<Button>("NextButton").IsEnabled = index != 2;
        Find<Button>("NextButton").Content = index == 0 ? "Get started" : index == 1 ? "Install" : index == 3 ? "Open SingAlong" : "Installing";
        Find<Button>("CloseButton").IsEnabled = index != 2;
        Find<RadioButton>("CurrentUserOption").IsEnabled = index != 2;
        Find<RadioButton>("AllUsersOption").IsEnabled = index != 2;
    }

    private void RequestClose()
    {
        if (installing) return;
        if (page == 3)
        {
            allowClose = true;
            window.Close();
            return;
        }
        Find<Border>("CancelDialog").Visibility = Visibility.Visible;
        Find<Button>("KeepSetupButton").Focus();
    }

    private void SavePreview(string folder, string name)
    {
        var content = (FrameworkElement)window.Content;
        content.Measure(new Size(window.Width, window.Height));
        content.Arrange(new Rect(0, 0, window.Width, window.Height));
        content.UpdateLayout();
        var bitmap = new RenderTargetBitmap((int)window.Width, (int)window.Height, 96, 96, PixelFormats.Pbgra32);
        bitmap.Render(content);
        var encoder = new PngBitmapEncoder();
        encoder.Frames.Add(BitmapFrame.Create(bitmap));
        using (var file = File.Create(Path.Combine(folder, name + ".png"))) encoder.Save(file);
    }

    private async Task Next()
    {
        if (installing || Find<Border>("CancelDialog").Visibility == Visibility.Visible) return;
        if (page == 0) { ShowPage(1); return; }
        if (page == 3)
        {
            try
            {
                if (!preview) Process.Start(new ProcessStartInfo(Path.Combine(installedPath, "SingAlong.exe")) { UseShellExecute = true });
                allowClose = true;
                window.Close();
            }
            catch (Exception error)
            {
                // Keep the installer open if the installed app cannot be launched.
                Find<TextBlock>("ErrorText").Text = error.Message;
                ShowPage(1);
            }
            return;
        }

        string destination;
        Find<TextBlock>("ErrorText").Text = "";
        try
        {
            string input = Find<TextBox>("InstallPath").Text.Trim();
            if (!Path.IsPathRooted(input) || input.IndexOfAny(new[] { '"', '\r', '\n' }) >= 0)
                throw new InvalidOperationException("Enter an absolute installation folder.");
            destination = Path.GetFullPath(input).TrimEnd(Path.DirectorySeparatorChar);
            if (destination.Length <= Path.GetPathRoot(destination).Length)
                throw new InvalidOperationException("Choose a folder inside the drive.");
            if (destination.StartsWith(@"\\", StringComparison.Ordinal))
                throw new InvalidOperationException("Choose a folder on a local drive.");
            if (Directory.Exists(destination) && Directory.EnumerateFileSystemEntries(destination).Any() &&
                !File.Exists(Path.Combine(destination, "Uninstall SingAlong.exe")))
                throw new InvalidOperationException("Choose an empty folder or your existing SingAlong installation.");
            if (Process.GetProcessesByName("SingAlong").Length > 0)
                throw new InvalidOperationException("Close SingAlong, then click Install again.");
            if (preview) throw new InvalidOperationException("Preview mode: installation is disabled.");
        }
        catch (Exception error)
        {
            Find<TextBlock>("ErrorText").Text = error.Message;
            return;
        }

        installing = true;
        ShowPage(2);
        var motion = new DoubleAnimation(-110, 390, TimeSpan.FromSeconds(1.5)) { RepeatBehavior = RepeatBehavior.Forever };
        Find<System.Windows.Media.TranslateTransform>("ProgressMotion").BeginAnimation(System.Windows.Media.TranslateTransform.XProperty, motion);
        string engineFolder = Path.Combine(Path.GetTempPath(), "SingAlongSetup-" + Guid.NewGuid().ToString("N"));
        try
        {
            Directory.CreateDirectory(engineFolder);
            string engine = Path.Combine(engineFolder, "install-engine.exe");
            using (Stream source = Assembly.GetExecutingAssembly().GetManifestResourceStream("SingAlong.InstallEngine.exe"))
            using (FileStream output = new FileStream(engine, FileMode.CreateNew, FileAccess.Write))
            {
                if (source == null) throw new InvalidOperationException("The installer payload is missing.");
                await source.CopyToAsync(output);
            }
            // NSIS requires /D to be the last argument, without quotes even when it contains spaces.
            var start = new ProcessStartInfo(engine)
            {
                Arguments = "/S " + (AllUsers ? "/allusers" : "/currentuser") + " /D=" + destination,
                UseShellExecute = AllUsers,
                CreateNoWindow = !AllUsers,
                WindowStyle = ProcessWindowStyle.Hidden,
                WorkingDirectory = engineFolder
            };
            if (AllUsers) start.Verb = "runas";
            int exitCode = await Task.Run(delegate
            {
                using (Process process = Process.Start(start))
                {
                    process.WaitForExit();
                    return process.ExitCode;
                }
            });
            if (exitCode != 0 && exitCode != 3010)
                throw new InvalidOperationException("Installation did not complete (code " + exitCode + "). Please try again.");
            if (!File.Exists(Path.Combine(destination, "SingAlong.exe")))
                throw new InvalidOperationException("The installed app was not found in the selected folder.");
            installedPath = destination;
            ShowPage(3);
        }
        catch (Win32Exception error)
        {
            Find<TextBlock>("ErrorText").Text = error.NativeErrorCode == 1223
                ? "Administrator permission was cancelled. Choose Only for me or try again."
                : error.Message;
            ShowPage(1);
        }
        catch (Exception error)
        {
            Find<TextBlock>("ErrorText").Text = error.Message;
            ShowPage(1);
        }
        finally
        {
            installing = false;
            Find<System.Windows.Media.TranslateTransform>("ProgressMotion").BeginAnimation(System.Windows.Media.TranslateTransform.XProperty, null);
            // The directory is a unique temporary folder created by this invocation.
            try { if (Directory.Exists(engineFolder)) Directory.Delete(engineFolder, true); }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }

    [STAThread]
    private static int Main(string[] args)
    {
        bool created;
        using (var mutex = new Mutex(true, @"Local\SingAlong.Setup.UI", out created))
        {
            if (!created) return 0;
            try { return Run(args); }
            finally { mutex.ReleaseMutex(); }
        }
    }

    private static int Run(string[] args)
    {
        AppContext.SetSwitch("Switch.System.Windows.DoNotScaleForDpiChanges", false);
        AppContext.SetSwitch("Switch.System.Windows.DoNotUsePresentationDpiCapabilityTier2OrGreater", false);
        var app = new Application();
        var wizard = new Wizard(args.Contains("--preview"));
        if (args.Length == 2 && args[0] == "--render-preview")
        {
            Directory.CreateDirectory(args[1]);
            wizard.SavePreview(args[1], "welcome");
            wizard.ShowPage(1);
            wizard.SavePreview(args[1], "options");
            wizard.RequestClose();
            wizard.SavePreview(args[1], "confirmation");
            return 0;
        }
        if (args.Contains("--validate"))
        {
            wizard.ShowPage(1);
            if (wizard.Find<Button>("NextButton").Content.ToString() != "Install") return 1;
            wizard.Find<RadioButton>("AllUsersOption").IsChecked = true;
            if (!wizard.Find<TextBox>("InstallPath").Text.EndsWith("SingAlong")) return 1;
            wizard.ShowPage(2);
            if (wizard.Find<Button>("CloseButton").IsEnabled) return 1;
            wizard.ShowPage(0);
            wizard.RequestClose();
            if (wizard.Find<Border>("CancelDialog").Visibility != Visibility.Visible) return 1;
            Console.WriteLine("Custom wizard XAML and navigation validated.");
            return 0;
        }
        return app.Run(wizard.window);
    }
}
