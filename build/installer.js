const fs = require('node:fs/promises');
const path = require('node:path');
const semver = require('semver');

const projectDir = path.resolve(__dirname, '..');

async function buildInstaller() {
  const config = JSON.parse(await fs.readFile(path.join(__dirname, 'config.json'), 'utf8'));
  const version = config.version;
  // Stable, canonical versions avoid equivalent versions sharing an output name.
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version) || semver.valid(version) !== version) {
    throw new Error('Set build/config.json version to a stable version such as 0.1.0 or 0.2.1.');
  }
  if (process.platform !== 'win32') throw new Error('Run the installer build on Windows.');

  const outputRoot = path.join(__dirname, 'app');
  const outputDir = path.join(outputRoot, version);
  await fs.mkdir(outputRoot, { recursive: true });
  try {
    // Exclusive reservation also prevents two builds of the same version running together.
    await fs.mkdir(outputDir);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(`Build ${version} already exists or is in progress: ${outputDir}. Choose a new version.`);
    }
    throw error;
  }

  try {
    const { build, Platform, Arch } = require('electron-builder');
    await build({
      projectDir,
      targets: Platform.WINDOWS.createTarget('nsis', Arch.x64),
      publish: 'never',
      config: {
        appId: 'com.andiilul.singalong',
        productName: 'SingAlong',
        extraMetadata: { version },
        electronLanguages: ['en-US', 'id'],
        directories: { output: outputDir, buildResources: __dirname },
        // PowerShell helpers must be real files that Windows can execute.
        asar: false,
        files: [
          'main.js', 'preload.js', 'playback.js', 'playback-clock.js', 'lyrics.js', 'window-position.js',
          'overlay.html', 'overlay.css', 'controls.html', 'controls.css',
          'controls-preload.js', 'spotify.ps1', 'fullscreen.ps1',
          'singalong-icon.png', 'font/**/*', 'locales/*.json', 'package.json',
        ],
        electronDist: path.join(projectDir, 'node_modules', 'electron', 'dist'),
        win: {
          target: 'nsis',
          artifactName: 'SingAlong-${version}.${ext}',
          icon: path.join(__dirname, 'icon.ico'),
          signExecutable: false,
        },
        nsis: {
          installerIcon: path.join(__dirname, 'icon.ico'),
          uninstallerIcon: path.join(__dirname, 'icon.ico'),
          oneClick: false,
          perMachine: false,
          allowToChangeInstallationDirectory: true,
          createDesktopShortcut: true,
          shortcutName: 'SingAlong',
          runAfterFinish: false,
        },
      },
    });
    const installer = path.join(outputDir, `SingAlong-${version}.exe`);
    const stat = await fs.stat(installer);
    if (!stat.size) throw new Error('The installer is empty.');
    await fs.writeFile(path.join(outputDir, 'build-status.json'),
      JSON.stringify({ version, status: 'complete', installer: path.basename(installer) }, null, 2) + '\n');
    console.log(`Installer ready: ${installer}`);
  } catch (error) {
    await fs.writeFile(path.join(outputDir, 'build-status.json'),
      JSON.stringify({ version, status: 'failed', message: error.message }, null, 2) + '\n');
    throw error;
  }
}

buildInstaller().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
