// Halaman dashboard.html: daftar CV milik pengguna yang sedang login.

const authAction = new URLSearchParams(location.search).get('auth');
if (authAction === 'register' || authAction === 'login') {
  $('#authStatus').textContent = authAction === 'register'
    ? 'Akun berhasil dibuat dan login.'
    : 'Login berhasil.';
  $('#authStatus').hidden = false;
  history.replaceState(null, '', '/dashboard');
}

// Logout di header
$('#logout').addEventListener('click', async () => {
  await apiFetch('/api/auth/logout', 'POST');
  location.href = '/login';
});

$('#newCV').addEventListener('click', async () => {
  // CV baru: judul awal default, isi data kosong
  const button = $('#newCV');
  button.disabled = true;
  button.textContent = 'Membuat CV...';
  const { ok, data } = await apiFetch('/api/cv', 'POST', {
    title: 'CV Tanpa Judul',
    data: { contact: {}, summary: '', experience: [], organizations: [], education: [], skills: [], tools: [], projects: [] },
  });
  if (!ok) {
    showMsg(data.error);
    button.disabled = false;
    button.textContent = '+ Buat CV baru';
    return;
  }
  location.href = `/editor?id=${data.id}`;
});

const tbody = $('#table tbody');
tbody.addEventListener('click', async (e) => {
  const button = e.target.closest('button[data-del]');
  if (!button) return;
  if (!confirm('Hapus CV ini secara permanen?')) return;

  button.disabled = true;
  const { ok, data } = await apiFetch(`/api/cv/${button.dataset.del}`, 'DELETE');
  if (!ok) {
    showMsg(data.error || 'Gagal menghapus CV.');
    button.disabled = false;
    return;
  }
  load();
});

async function load() {
  $('#loading').hidden = false;
  $('#msg').hidden = true;
  $('#empty').hidden = true;
  $('#tableWrap').hidden = true;
  $('#table').hidden = true;

  const { ok, data } = await apiFetch('/api/auth/me');
  if (ok) { $('#who').textContent = data.email; }
  else { location.href = '/login'; return; }

  const { ok: okL, data: listData } = await apiFetch('/api/cv');
  $('#loading').hidden = true;
  if (!okL) { showMsg(listData.error); return; }

  const items = listData.items || [];
  if (items.length === 0) { $('#empty').hidden = false; return; }

  $('#table').hidden = false;
  $('#tableWrap').hidden = false;
  tbody.innerHTML = items.map(item => `
    <tr>
      <td data-label="Judul"><a href="/editor?id=${item.id}">${esc(item.title)}</a></td>
      <td data-label="Terakhir diubah" class="muted">${esc(new Date(item.updated_at).toLocaleString())}</td>
      <td data-label="Aksi"><button class="btn btn-sm btn-danger" data-del="${item.id}" aria-label="Hapus CV: ${esc(item.title)}">Hapus</button></td>
    </tr>
  `).join('');
}

load();
