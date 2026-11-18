const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  const inputs = document.querySelectorAll('input');
  for (const input of inputs) {
    input.addEventListener('input', () => {
      let value = input.value;
      if (input.type === 'checkbox') value = input.checked;
      if (input.type === 'range') {
        value = input.valueAsNumber;
        document.querySelector(`output[for="${input.id}"]`).value = `${value}%`;
      }
      ipcRenderer.send('update-overlay-setting', input.id, value);
    });
  }
  ipcRenderer.on('settings-state', (_event, settings) => {
    document.querySelector('#backgroundBlur').disabled = !settings.backgroundBlurSupported;
    document.querySelector('#background-blur-row').title = settings.backgroundBlurSupported
      ? 'Efek Acrylic Windows' : 'Memerlukan Windows 11 build 22621 atau lebih baru';
    for (const input of inputs) {
      if (input.type === 'checkbox') input.checked = settings[input.id];
      else input.value = settings[input.id];
      if (input.type === 'range') {
        document.querySelector(`output[for="${input.id}"]`).value = `${input.value}%`;
      }
    }
  });
  document.querySelector('#dismiss-settings').addEventListener('click', () => ipcRenderer.send('dismiss-settings'));
  document.querySelector('#close-settings').addEventListener('click', () => ipcRenderer.send('close-settings'));
});
