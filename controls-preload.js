const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  let translations = {};
  let activeLanguage = 'en';
  const languageSelect = document.querySelector('#language');
  languageSelect.addEventListener('change', async () => {
    languageSelect.disabled = true;
    try {
      const saved = await ipcRenderer.invoke('set-language', languageSelect.value);
      if (!saved) throw new Error('Language preference was not saved');
      document.querySelector('#language-message').textContent = '';
    } catch {
      languageSelect.value = activeLanguage;
      document.querySelector('#language-message').textContent = translations.languageError;
    } finally {
      languageSelect.disabled = false;
    }
  });
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
    translations = settings.translations;
    activeLanguage = settings.language;
    document.documentElement.lang = activeLanguage;
    document.title = translations.settingsTitle;
    languageSelect.value = activeLanguage;
    for (const element of document.querySelectorAll('[data-i18n]')) {
      element.textContent = translations[element.dataset.i18n];
    }
    for (const [id, key] of [['dismiss-settings', 'dismissSettings'], ['close-settings', 'exit']]) {
      const button = document.getElementById(id);
      button.title = translations[key];
      button.setAttribute('aria-label', translations[key]);
    }
    document.querySelector('#backgroundBlur').disabled = !settings.backgroundBlurSupported;
    document.querySelector('#background-blur-row').title = settings.backgroundBlurSupported
      ? translations.acrylic : translations.blurUnavailable;
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
