// Halaman dashboard.html: daftar CV milik pengguna yang sedang login.

// Logout di header
$('#logout').addEventListener('click', async () => {
  await apiFetch('/api/auth/logout', 'POST');
  location.href = 'login.html';
});

$('#newCV').addEventListener('click', async () => {
  // CV baru: judul awal default, isi data kosong
  const { ok, data } = await apiFetch('/api/cv', 'POST', {
    title: 'CV Tanpa Judul',
    data: { contact: {}, summary: '', experience: [], education: [], skills: [], projects: [] },
  });
  if (!ok) { showMsg(data.error); return; }
  location.href = `editor.html?id=${data.id}`;
});

async function load() {
  const { ok, data } = await apiFetch('/api/auth/me');
  if (ok) { $('#who').textContent = data.email; }
  else { location.href = 'login.html'; return; }

  const { ok: okL, data: listData } = await apiFetch('/api/cv');
  if (!okL) { showMsg(listData.error); return; }

  const items = listData.items || [];
  if (items.length === 0) { $('#empty').hidden = false; return; }

  $('#table').hidden = false;
  const tbody = $('#table tbody');
  tbody.innerHTML = items.map(item => `
    <tr>
      <td><a href="editor.html?id=${item.id}">${esc(item.title)}</a></td>
      <td class="muted">${esc(new Date(item.updated_at).toLocaleString())}</td>
      <td><button class="btn btn-sm" data-del="${item.id}">Hapus</button></td>
    </tr>
  `).join('');

  // Hapus + KONFIRMASI (ketentuan spesifikasi)
  tbody.addEventListener('click', async (e) => {
    const id = e.target?.dataset?.del;
    if (!id) return;
    if (!confirm('Hapus CV ini secara permanen?')) return;
    const { ok: okDel } = await apiFetch(`/api/cv/${id}`, 'DELETE');
    if (!okDel) { showMsg('Gagal menghapus CV.'); return; }
    load();
  });
}

load();
