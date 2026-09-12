using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
internal static class Program {
  [STAThread] private static int Main() {
    string rootPath=AppDomain.CurrentDomain.BaseDirectory;
    string cmdPath=Path.Combine(rootPath,"bin","launch-kiosk.cmd");
    if(!File.Exists(cmdPath)){MessageBox.Show("Could not find launcher script:\n"+cmdPath,"Kiosk Launcher",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}
    try { var p=Process.Start(new ProcessStartInfo{FileName="cmd.exe",Arguments="/c \"\""+cmdPath+"\"\"",WorkingDirectory=rootPath,UseShellExecute=false,CreateNoWindow=true}); return p==null?1:0; }
    catch(Exception ex){MessageBox.Show("Failed to start kiosk launcher:\n"+ex.Message,"Kiosk Launcher",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}
  }
}
