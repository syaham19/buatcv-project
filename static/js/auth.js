// Halaman login.html: satu form, dua tombol (login / register).

const form = $('#form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  const action = e.submitter?.dataset.action || 'login';
  const email = form.email.value.trim();
  const password = form.password.value;

  form.password.autocomplete = action === 'register' ? 'new-password' : 'current-password';
  const url = action === 'login' ? '/api/auth/login' : '/api/auth/register';
  const buttons = Array.from(form.querySelectorAll('button[type="submit"]'));
  buttons.forEach((button) => {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
  });
  showMsg('');
  $('#auth-status').hidden = true;

  try {
    const { ok, data } = await apiFetch(url, 'POST', { email, password });
    if (!ok) {
      showMsg(data.error || 'Tidak dapat memproses akun. Periksa data dan coba lagi.');
      return;
    }

    const { ok: sessionOK } = await apiFetch('/api/auth/me');
    if (!sessionOK) {
      showMsg('Autentikasi belum berhasil. Periksa cookie sesi browser, lalu coba lagi.');
      return;
    }

    $('#auth-status').textContent = 'Autentikasi berhasil. Membuka dashboard…';
    $('#auth-status').hidden = false;
    location.href = `/dashboard?auth=${action}`;
  } catch {
    showMsg('Tidak dapat terhubung ke server. Periksa koneksi, lalu coba lagi.');
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    });
  }
});
