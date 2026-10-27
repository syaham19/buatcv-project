// Halaman editor.html: form editor + live preview + simpan (POST/PUT /api/cv).
//
// Desain:
// - Semua perubahan form langsung menyimpan ke objek "state" (lingkup
//   halaman ini saja) dan memicu renderPreview() — sehingga preview
//   selalu terbaru tanpa reload.
// - Bagian berulang (pengalaman/pendidikan/keterampilan/proyek) bisa
//   ditambah, diurutkan, dan dihapus.
// - Bagian opsional kosong tidak ditampilkan di preview.

const state = {
  contact: {}, summary: '',
  experience: [], education: [], skills: [], projects: [],
};
let cvID = null;

/* ---------- muat CV dari URL `?id=N` ------------------------------- */

async function loadCV() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { location.href = 'dashboard.html'; return; }

  // cek sesi
  const { ok } = await apiFetch('/api/auth/me');
  if (!ok) { location.href = 'login.html'; return; }

  const { ok: okC, data: doc, status } = await apiFetch(`/api/cv/${id}`);
  if (!okC) {
    if (status === 404) { alert('CV tidak ditemukan atau bukan milik Anda.'); }
    showMsg(doc.error || 'Gagal memuat CV.');
    return;
  }

  cvID = doc.id;
  Object.assign(state, doc.data || {});
  $('#f-title').value = doc.title || '';
  fillContact();
  renderAll();
}

function fillContact() {
  $('#f-name').value     = state.contact?.name     || '';
  $('#f-email').value    = state.contact?.email    || '';
  $('#f-phone').value    = state.contact?.phone    || '';
  $('#f-location').value = state.contact?.location || '';
  $('#f-summary').value  = state.summary           || '';
}

/* ---------- binding field tunggal ---------------------------------- */

$('#f-name').addEventListener('input',     e => { state.contact.name     = e.target.value; render(); });
$('#f-email').addEventListener('input',    e => { state.contact.email    = e.target.value; render(); });
$('#f-phone').addEventListener('input',    e => { state.contact.phone    = e.target.value; render(); });
$('#f-location').addEventListener('input', e => { state.contact.location = e.target.value; render(); });
$('#f-summary').addEventListener('input',  e => { state.summary          = e.target.value; render(); });
$('#f-title').addEventListener('input',    e => { updateTitleBar();      });

function updateTitleBar() {
  const t = $('#f-title').value.trim() || 'CV Tanpa Judul';
  $('#titleBar').textContent = t;
}

/* ---------- bagian berulang --------------------------------------- */

const FIELDS = {
  experience: [
    { key: 'company',     ph: 'Perusahaan' },
    { key: 'role',        ph: 'Jabatan' },
    { key: 'start',       ph: 'Mulai (mis. 2024-01)' },
    { key: 'end',         ph: 'Selesai (kosong = masih bekerja)' },
    { key: 'description', ph: 'Ringkasan tanggung jawab & hasil', textarea: true },
  ],
  education: [
    { key: 'degree', ph: 'Gelar / jurusan' },
    { key: 'school', ph: 'Nama sekolah / universitas' },
    { key: 'start',  ph: 'Mulai (tahun)' },
    { key: 'end',    ph: 'Lulus (tahun)' },
  ],
  projects: [
    { key: 'name',        ph: 'Nama proyek' },
    { key: 'description', ph: 'Deskripsi & peran Anda', textarea: true },
  ],
};

// Buat elemen input untuk satu entri
function entryHTML(kind, i) {
  const fields = FIELDS[kind] || [];
  const isSkills = kind === 'skills';
  const inner = isSkills
    ? `<input data-kind="${kind}" data-i="${i}" placeholder="Keterampilan">`
    : fields.map(f => f.textarea
        ? `<textarea data-kind="${kind}" data-i="${i}" data-key="${f.key}" rows="3" placeholder="${f.ph}"></textarea>`
        : `<input data-kind="${kind}" data-i="${i}" data-key="${f.key}" placeholder="${f.ph}">`).join('');
  return `
    <div class="entry" data-kind="${kind}" data-i="${i}">
      ${inner}
      <div class="row">
        <button class="btn btn-sm" data-up="${kind}">▲</button>
        <button class="btn btn-sm" data-down="${kind}">▼</button>
        <button class="btn btn-sm" data-remove="${kind}">Hapus entri</button>
      </div>
    </div>`;
}

// Render seluruh bagian berulang dari state ke form
function renderEntries() {
  for (const kind of ['experience', 'education', 'skills', 'projects']) {
    const box = $(`#f-${kind}`);
    const arr = state[kind];
    box.innerHTML = arr.length
      ? arr.map((_, i) => entryHTML(kind, i)).join('')
      : `<p class="muted" style="margin:4px 0">Belum ada entri.</p>`;

    // isi nilai existing ke elemen form baru
    box.querySelectorAll(`.entry[data-kind="${kind}"]`).forEach((el, i) => {
      arr[i] = arr[i] || (kind === 'skills' ? '' : {});
      if (kind === 'skills') {
        el.querySelector('input').value = arr[i];
      } else {
        for (const f of FIELDS[kind]) {
          const inp = el.querySelector(`[data-key="${f.key}"]`);
          if (inp) inp.value = arr[i][f.key] || '';
        }
      }
    });
  }
}

// Semua input dalam entri berulang → ubah state (event delegation)
document.addEventListener('input', (e) => {
  const { kind, i, key } = e.target.dataset;
  if (!kind || i === undefined) return;
  const idx = Number(i);
  if (kind === 'skills') state.skills[idx] = e.target.value;
  else { state[kind][idx] = state[kind][idx] || {}; state[kind][idx][key] = e.target.value; }
  render();
});

function move(arr, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

document.addEventListener('click', (e) => {
  const b = e.target;
  if (b.dataset.add)      { state[b.dataset.add].push(b.dataset.add === 'skills' ? '' : {}); renderAll(); }
  if (b.dataset.up)       { const i = Number(b.closest('.entry').dataset.i); move(state[b.dataset.up], i, -1); renderAll(); }
  if (b.dataset.down)     { const i = Number(b.closest('.entry').dataset.i); move(state[b.dataset.down], i, +1); renderAll(); }
  if (b.dataset.remove)   {
    const i = Number(b.closest('.entry').dataset.i);
    state[b.dataset.remove].splice(i, 1);
    renderAll();
  }
});

function renderAll() { renderEntries(); updateTitleBar(); render(); }

/* ---------- preview ----------------------------------------------- */

function render() {
  const sec = (title, inner) => inner ? `<h2>${esc(title)}</h2>${inner}` : '';
  const c = state.contact || {};

  const exp = (state.experience || []).filter(x => x.company || x.role?.trim()).map(x => `
    <div class="item">
      <div class="item-head"><b>${esc(x.role)}</b><span class="item-dates">${esc(x.start || '')} – ${esc(x.end || 'sekarang')}</span></div>
      <div><i>${esc(x.company)}</i></div>
      <p style="margin:4px 0;white-space:pre-wrap">${esc(x.description)}</p>
    </div>`).join('');

  const edu = (state.education || []).filter(x => x.school || x.degree).map(x => `
    <div class="item">
      <div class="item-head"><b>${esc(x.degree)}</b><span class="item-dates">${esc(x.start || '')} – ${esc(x.end || '')}</span></div>
      <div>${esc(x.school)}</div>
    </div>`).join('');

  const skills = (state.skills || []).filter(s => s.trim()).map(s => `<li>${esc(s)}</li>`).join('');
  const prj = (state.projects || []).filter(x => x.name).map(x => `
    <div class="item"><div class="item-head"><b>${esc(x.name)}</b></div>
    <p style="margin:4px 0;white-space:pre-wrap">${esc(x.description)}</p></div>`).join('');

  $('#preview').innerHTML = `
    <h1>${esc(c.name || 'Nama Lengkap')}</h1>
    <div class="contact">${esc([c.email, c.phone, c.location].filter(Boolean).join(' · '))}</div>
    ${sec('Ringkasan', state.summary ? `<p style="white-space:pre-wrap">${esc(state.summary)}</p>` : '')}
    ${sec('Pengalaman Kerja', exp)}
    ${sec('Pendidikan', edu)}
    ${sec('Keterampilan', skills ? `<ul>${skills}</ul>` : '')}
    ${sec('Proyek', prj)}
  `;
}

/* ---------- simpan (judul + isi) ke backend ---------------------- */

$('#save').addEventListener('click', async () => {
  const title = $('#f-title').value.trim();
  if (!title) { showMsg('Judul CV wajib diisi.'); return; }

  showMsg('Menyimpan…');
  const { ok, data, status } = await apiFetch(`/api/cv/${cvID}`, 'PUT', { title, data: state });
  if (!ok) {
    showMsg(data.error || (status === 404 ? 'CV tidak ditemukan.' : 'Gagal menyimpan CV.'));
    return;
  }
  showMsg('CV tersimpan ✓');
  setTimeout(() => showMsg(''), 2000);
});

// Logout di header
$('#logout').addEventListener('click', async () => {
  await apiFetch('/api/auth/logout', 'POST'); // sesi di database juga dihapus
  location.href = 'login.html';
});

loadCV();
