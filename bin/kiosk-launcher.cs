using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

internal static class Program
{
    [STAThread]
    private static int Main()
    {
        string rootPath = AppDomain.CurrentDomain.BaseDirectory;
        string cmdPath = Path.Combine(rootPath, "bin", "launch-kiosk.cmd");

        if (!File.Exists(cmdPath))
        {
            MessageBox.Show(
                "Could not find launcher script:\n" + cmdPath,
                "Kiosk Launcher",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return 1;
        }

        var startInfo = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = "/c \"\"" + cmdPath + "\"\"",
            WorkingDirectory = rootPath,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        try
        {
            Process process = Process.Start(startInfo);
            if (process == null)
            {
                MessageBox.Show(
                    "The kiosk launcher could not be started.",
                    "Kiosk Launcher",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                return 1;
            }

            return 0;
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "Failed to start kiosk launcher:\n" + ex.Message,
                "Kiosk Launcher",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return 1;
        }
    }
}
