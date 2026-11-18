const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#no').addEventListener('click', () => ipcRenderer.send('confirm-exit-result', false));
  document.querySelector('#yes').addEventListener('click', () => ipcRenderer.send('confirm-exit-result', true));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') ipcRenderer.send('confirm-exit-result', false);
  });
  ipcRenderer.on('confirmation-language', (_event, { language, translations }) => {
    document.documentElement.lang = language;
    document.querySelector('#question').textContent = translations.closeQuestion;
    document.querySelector('#yes').textContent = translations.yes;
    document.querySelector('#no').textContent = translations.no;
    document.querySelector('#no').focus();
  });
});
