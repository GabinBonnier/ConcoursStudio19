const Dropzone = (() => {
  function bind(el, onFile) {
    if (!el) return;
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('dropzone--hover'); });
    el.addEventListener('dragleave', () => el.classList.remove('dropzone--hover'));
    el.addEventListener('drop', e => {
      e.preventDefault(); el.classList.remove('dropzone--hover');
      const file = e.dataTransfer.files[0];
      if (file) { _setFile(el, file.name); if (onFile) onFile(file); }
    });
    el.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.mp3,.mp4';
      input.onchange = () => { if (input.files[0]) { _setFile(el, input.files[0].name); if (onFile) onFile(input.files[0]); } };
      input.click();
    });
  }

  function _setFile(el, name) {
    el.innerHTML = `<div class="dropzone__icon" style="color:var(--green)">✓</div><div class="dropzone__text">${name}</div><div class="dropzone__hint dropzone__hint--green">Fichier prêt à être envoyé</div>`;
  }

  function reset(el, placeholder = 'Glissez ou cliquez pour choisir') {
    if (!el) return;
    el.innerHTML = `<div class="dropzone__icon">🎵</div><div class="dropzone__text">${placeholder}</div><div class="dropzone__hint dropzone__hint--gold">MP3 · MP4 · Max 500 Mo</div>`;
  }

  return { bind, reset };
})();
