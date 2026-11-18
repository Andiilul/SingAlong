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
  for (const id of ['horizontalAnchor', 'verticalAnchor']) {
    const select = document.getElementById(id);
    select.addEventListener('change', () => {
      ipcRenderer.send('update-overlay-setting', id, select.value);
    });
  }
  const inputs = document.querySelectorAll('input');
  for (const input of inputs) {
    input.addEventListener('input', () => {
      let value = input.value;
      if (input.type === 'number') {
        if (!input.checkValidity() || !Number.isInteger(input.valueAsNumber)) {
          return;
        }
        value = input.valueAsNumber;
      }
      if (input.type === 'checkbox') value = input.checked;
      if (input.type === 'range') {
        value = input.valueAsNumber;
        const output = document.querySelector(`output[for="${input.id}"]`);
        if (output) output.value = `${value}%`;
      }
      ipcRenderer.send('update-overlay-setting', input.dataset.setting ?? input.id, value);
    });
  }
  ipcRenderer.on('settings-state', (_event, settings) => {
    translations = settings.translations;
    activeLanguage = settings.language;
    document.documentElement.lang = activeLanguage;
    document.title = translations.settingsTitle;
    languageSelect.value = activeLanguage;
    document.querySelector('#horizontalAnchor').value = settings.horizontalAnchor;
    document.querySelector('#verticalAnchor').value = settings.verticalAnchor;
    const middleX = settings.horizontalAnchor === 'middle';
    const middleY = settings.verticalAnchor === 'middle';
    document.querySelector('#horizontalPadding').disabled = middleX;
    document.querySelector('#verticalPadding').disabled = middleY;
    document.querySelector('#horizontalPadding').max = settings.positionLimits.horizontalPadding;
    document.querySelector('#verticalPadding').max = settings.positionLimits.verticalPadding;
    for (const axis of ['horizontal', 'vertical']) {
      const number = document.getElementById(`${axis}Padding`);
      const slider = document.getElementById(`${axis}PaddingSlider`);
      slider.disabled = number.disabled;
      slider.max = number.max;
    }
    document.querySelector('#position-padding').hidden = middleX && middleY;
    for (const element of document.querySelectorAll('[data-i18n]')) {
      element.textContent = translations[element.dataset.i18n];
    }
    for (const [id, key] of [['dismiss-settings', 'dismissSettings']]) {
      const button = document.getElementById(id);
      button.title = translations[key];
      button.setAttribute('aria-label', translations[key]);
    }
    for (const input of inputs) {
      if (input.type === 'checkbox') input.checked = settings[input.id];
      else input.value = settings[input.dataset.setting ?? input.id];
      if (input.type === 'range') {
        const output = document.querySelector(`output[for="${input.id}"]`);
        if (output) output.value = `${input.value}%`;
      }
    }
  });
  document.querySelector('#dismiss-settings').addEventListener('click', () => ipcRenderer.send('dismiss-settings'));
  document.querySelector('#github-credit').addEventListener('click', () => ipcRenderer.send('open-github-credit'));
});
