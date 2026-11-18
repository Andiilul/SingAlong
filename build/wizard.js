const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

async function compileWizard({ version, enginePath, outputPath }) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid wizard version.');
  const framework = path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319');
  const compiler = path.join(framework, 'csc.exe');
  try {
    await fs.access(compiler);
    await fs.access(path.join(framework, 'WPF', 'PresentationFramework.dll'));
  } catch {
    throw new Error('The custom installer requires the Windows .NET Framework compiler and WPF components.');
  }
  const work = path.join(path.dirname(outputPath), '.wizard');
  await fs.mkdir(work, { recursive: true });
  const metadata = path.join(work, 'Version.cs');
  await fs.writeFile(metadata, [
    'using System.Reflection;',
    '[assembly: AssemblyTitle("SingAlong Setup")]',
    '[assembly: AssemblyProduct("SingAlong")]',
    '[assembly: AssemblyCompany("Andiilul")]',
    '[assembly: AssemblyCopyright("Created by Andiilul 2026")]',
    `[assembly: AssemblyVersion("${version}.0")]`,
    `[assembly: AssemblyFileVersion("${version}.0")]`,
  ].join('\n'));
  const args = [
    '/nologo', '/target:winexe', '/platform:x64', '/optimize+', '/langversion:5',
    `/out:${outputPath}`,
    `/win32icon:${path.join(__dirname, 'icon.ico')}`,
    `/win32manifest:${path.join(__dirname, 'wizard.manifest')}`,
    `/resource:${path.join(__dirname, 'wizard.xaml')},SingAlong.Wizard.xaml`,
    `/resource:${enginePath},SingAlong.InstallEngine.exe`,
    `/reference:${path.join(framework, 'WPF', 'WindowsBase.dll')}`,
    `/reference:${path.join(framework, 'WPF', 'PresentationCore.dll')}`,
    `/reference:${path.join(framework, 'WPF', 'PresentationFramework.dll')}`,
    `/reference:${path.join(framework, 'System.Xaml.dll')}`,
    path.join(__dirname, 'Wizard.cs'), metadata,
  ];
  await new Promise((resolve, reject) => {
    const child = spawn(compiler, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let diagnostic = '';
    child.stdout.on('data', data => { diagnostic += data; });
    child.stderr.on('data', data => { diagnostic += data; });
    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`Custom wizard compilation failed:\n${diagnostic.trim()}`));
    });
  });
}

module.exports = { compileWizard };
