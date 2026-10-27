(() => {
  const root = document.documentElement;
  const storageKey = 'cvats-theme';
  const compactLayout = window.matchMedia('(max-width: 380px)');

  try {
    const savedTheme = localStorage.getItem(storageKey);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      root.dataset.theme = savedTheme;
    }
  } catch (error) {
    console.warn('Preferensi tema tidak dapat dibaca.', error);
  }

  function updateThemeButton() {
    const isDark = root.dataset.theme === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const nextMode = isDark ? 'terang' : 'gelap';
      button.textContent = compactLayout.matches
        ? (isDark ? 'Terang' : 'Gelap')
        : `Mode ${nextMode}`;
      button.setAttribute('aria-label', `Aktifkan mode ${nextMode}`);
      button.setAttribute('aria-pressed', String(isDark));
    });
  }

  updateThemeButton();
  compactLayout.addEventListener('change', updateThemeButton);

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme-toggle]');
    if (!button) return;

    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = theme;
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      console.warn('Preferensi tema tidak dapat disimpan.', error);
    }
    updateThemeButton();
  });
})();
