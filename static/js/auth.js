// Halaman login.html: satu form, dua tombol (login / register).

const form = $('#form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const action = e.submitter?.dataset.action || 'login';
  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email || password.length < 8) {
    showMsg('Email tidak valid atau password kurang dari 8 karakter.');
    return;
  }

  // Validasi di frontend hanya kenyamanan; validasi utama tetap di backend.
  const url = action === 'login' ? '/api/auth/login' : '/api/auth/register';
  const { ok, data } = await apiFetch(url, 'POST', { email, password });

  if (ok) {
    // Register/login sukses -> cookie sesi sudah di-set backend -> dasbor
    location.href = 'dashboard.html';
  } else {
    showMsg(data.error || 'Terjadi kesalahan, coba lagi.');
  }
});
