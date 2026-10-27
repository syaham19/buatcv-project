// Halaman editor.html: form editor + live preview + simpan (POST/PUT /api/cv).
//
// Desain:
// - Semua perubahan form langsung menyimpan ke objek "state" (lingkup
//   halaman ini saja) dan memicu renderPreview(), sehingga preview
//   selalu terbaru tanpa reload.
// - Bagian berulang (pengalaman/organisasi/pendidikan/keterampilan/proyek) bisa
//   ditambah, diurutkan, dan dihapus.
// - Bagian opsional kosong tidak ditampilkan di preview.

const state = {
  contact: {}, summary: '',
  experience: [], organizations: [], education: [], skills: [], tools: [], projects: [],
};
let cvID = null;
let toastTimer;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const TAG_FIELDS = {
  skills: { input: 'skills-input', list: 'skills-tags', status: 'skills-status', label: 'keterampilan' },
  tools: { input: 'tools-input', list: 'tools-tags', status: 'tools-status', label: 'tools' },
};

/* ---------- muat CV dari URL `?id=N` ------------------------------- */

async function loadCV() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { location.href = '/dashboard'; return; }

  // cek sesi
  const { ok } = await apiFetch('/api/auth/me');
  if (!ok) { $('#editorLoading').hidden = true; location.href = '/login'; return; }

  const { ok: okC, data: doc, status } = await apiFetch(`/api/cv/${id}`);
  if (!okC) {
    $('#editorLoading').hidden = true;
    if (status === 404) { alert('CV tidak ditemukan atau bukan milik Anda.'); }
    showMsg(doc.error || 'Gagal memuat CV.');
    return;
  }

  $('#editorLoading').hidden = true;
  cvID = doc.id;
  Object.assign(state, doc.data || {});
  state.contact ||= {};
  state.organizations ||= [];
  state.skills ||= [];
  state.tools ||= [];
  $('#f-title').value = doc.title || '';
  $('#save').disabled = false;
  fillContact();
  renderAll();
}

function fillContact() {
  $('#f-name').value     = state.contact?.name     || '';
  $('#f-email').value    = state.contact?.email    || '';
  $('#f-phone').value    = state.contact?.phone    || '';
  $('#f-location').value = state.contact?.location || '';
  $('#f-summary').value  = state.summary           || '';
  $('#photo-remove').hidden = !state.contact.photo;
}

/* ---------- binding field tunggal ---------------------------------- */

$('#f-name').addEventListener('input',     e => { state.contact.name     = e.target.value; clearFieldError(e.target, $('#f-name-error')); clearSaveStatus(); render(); });
$('#f-email').addEventListener('input',    e => { state.contact.email    = e.target.value; clearFieldError(e.target, $('#f-email-error')); clearSaveStatus(); render(); });
$('#f-phone').addEventListener('input',    e => { state.contact.phone    = e.target.value; clearSaveStatus(); render(); });
$('#f-location').addEventListener('input', e => { state.contact.location = e.target.value; clearSaveStatus(); render(); });
$('#f-summary').addEventListener('input',  e => { state.summary          = e.target.value; clearSaveStatus(); render(); });
$('#f-title').addEventListener('input',    e => { updateTitleBar(); clearFieldError(e.target, $('#f-title-error')); clearSaveStatus(); });

function clearFieldError(input, error) {
  input.removeAttribute('aria-invalid');
  error.textContent = '';
  error.hidden = true;
}

function clearSaveStatus() {
  clearTimeout(toastTimer);
  $('#toast').hidden = true;
}

function showSaveToast(message) {
  clearTimeout(toastTimer);
  $('#toast-message').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(clearSaveStatus, 5000);
}

function updateTitleBar() {
  const t = $('#f-title').value.trim() || 'CV Tanpa Judul';
  $('#titleBar').textContent = t;
}

/* ---------- bagian berulang --------------------------------------- */

const FIELDS = {
  experience: [
    { key: 'company', label: 'Perusahaan', ph: 'Nama perusahaan' },
    { key: 'role', label: 'Jabatan', ph: 'Jabatan' },
    { key: 'start', label: 'Mulai', ph: 'Contoh: 2024-01' },
    { key: 'end', label: 'Selesai', ph: 'Kosongkan jika masih bekerja' },
    { key: 'description', label: 'Tanggung jawab dan hasil', ph: 'Ringkasan tanggung jawab dan hasil', textarea: true },
  ],
  organizations: [
    { key: 'name', label: 'Nama organisasi', ph: 'Nama organisasi' },
    { key: 'role', label: 'Jabatan atau peran', ph: 'Contoh: Ketua, anggota, atau relawan' },
    { key: 'start', label: 'Mulai', ph: 'Contoh: 2024-01' },
    { key: 'end', label: 'Selesai', ph: 'Tahun atau bulan selesai' },
    { key: 'description', label: 'Kontribusi', ph: 'Jelaskan kontribusi dan kegiatan Anda', textarea: true },
  ],
  education: [
    { key: 'degree', label: 'Gelar atau jurusan', ph: 'Gelar atau jurusan' },
    { key: 'school', label: 'Sekolah atau universitas', ph: 'Nama institusi' },
    { key: 'start', label: 'Mulai', ph: 'Tahun mulai' },
    { key: 'end', label: 'Selesai', ph: 'Tahun selesai' },
  ],
  projects: [
    { key: 'name', label: 'Nama proyek', ph: 'Nama proyek' },
    { key: 'description', label: 'Deskripsi dan peran', ph: 'Jelaskan kontribusi Anda', textarea: true },
  ],
};

// Buat elemen input untuk satu entri
function entryHTML(kind, i) {
  const fields = FIELDS[kind] || [];
  const inner = fields.map(f => f.textarea
        ? `<label class="field"><span class="field-label">${f.label}</span><textarea data-kind="${kind}" data-i="${i}" data-key="${f.key}" rows="3" placeholder="${f.ph}"></textarea></label>`
        : `<label class="field"><span class="field-label">${f.label}</span><input data-kind="${kind}" data-i="${i}" data-key="${f.key}" placeholder="${f.ph}"></label>`).join('');
  return `
    <div class="entry" data-kind="${kind}" data-i="${i}">
      ${inner}
      <div class="row">
        <button class="btn btn-sm" type="button" data-up="${kind}" aria-label="Pindahkan entri ke atas">▲</button>
        <button class="btn btn-sm" type="button" data-down="${kind}" aria-label="Pindahkan entri ke bawah">▼</button>
        <button class="btn btn-sm" data-remove="${kind}">Hapus entri</button>
      </div>
    </div>`;
}

// Render seluruh bagian berulang dari state ke form
function renderEntries() {
  for (const kind of ['experience', 'organizations', 'education', 'projects']) {
    const box = $(`#f-${kind}`);
    const arr = state[kind];
    box.innerHTML = arr.length
      ? arr.map((_, i) => entryHTML(kind, i)).join('')
      : `<p class="muted" style="margin:4px 0">Belum ada entri.</p>`;

    // isi nilai existing ke elemen form baru
    box.querySelectorAll(`.entry[data-kind="${kind}"]`).forEach((el, i) => {
      arr[i] = arr[i] || {};
      for (const f of FIELDS[kind]) {
        const inp = el.querySelector(`[data-key="${f.key}"]`);
        if (inp) inp.value = arr[i][f.key] || '';
      }
    });
  }
  renderSkillTags();
}

function renderSkillTags() {
  renderTags('skills');
  renderTags('tools');
}

function renderTags(kind) {
  const config = TAG_FIELDS[kind];
  $(`#${config.list}`).innerHTML = state[kind].map((tag, i) => `
    <li class="skill-tag">
      <span>${esc(tag)}</span>
      <button class="skill-remove" type="button" data-remove-tag="${kind}" data-index="${i}" aria-label="Hapus ${config.label}: ${esc(tag)}">×</button>
    </li>
  `).join('');
}

function addTags(kind, value) {
  const config = TAG_FIELDS[kind];
  const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
  if (!tags.length) return false;

  const existing = new Set(state[kind].map(tag => tag.toLocaleLowerCase()));
  const added = [];
  for (const tag of tags) {
    const key = tag.toLocaleLowerCase();
    if (existing.has(key)) continue;
    existing.add(key);
    state[kind].push(tag);
    added.push(tag);
  }

  const status = $(`#${config.status}`);
  if (added.length) {
    status.textContent = config.label === 'tools'
      ? 'Tools ditambahkan.'
      : `${added.length} keterampilan ditambahkan.`;
    clearSaveStatus();
    renderAll();
  } else {
    status.textContent = `${config.label[0].toUpperCase()}${config.label.slice(1)} tersebut sudah ada.`;
  }
  return added.length > 0;
}

function commitTagInput(kind) {
  const input = $(`#${TAG_FIELDS[kind].input}`);
  const value = input.value.trim().replace(/,$/, '').trim();
  if (!value) return;
  addTags(kind, value);
  input.value = '';
  input.focus();
}

// Semua input dalam entri berulang → ubah state (event delegation)
document.addEventListener('input', (e) => {
  const tagKind = Object.keys(TAG_FIELDS).find(kind => TAG_FIELDS[kind].input === e.target.id);
  if (tagKind) {
    if (e.target.value.includes(',')) {
      const parts = e.target.value.split(',');
      e.target.value = parts.pop().trimStart();
      addTags(tagKind, parts.join(','));
    }
    return;
  }
  const { kind, i, key } = e.target.dataset;
  if (!kind || i === undefined) return;
  clearSaveStatus();
  const idx = Number(i);
  state[kind][idx] = state[kind][idx] || {};
  state[kind][idx][key] = e.target.value;
  render();
});

for (const [kind, config] of Object.entries(TAG_FIELDS)) {
  $(`#${config.input}`).addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTagInput(kind);
    } else if (e.key === 'Backspace' && !e.target.value && state[kind].length) {
      const removed = state[kind].pop();
      $(`#${config.status}`).textContent = `${config.label[0].toUpperCase()}${config.label.slice(1)} ${removed} dihapus.`;
      clearSaveStatus();
      renderAll();
    }
  });
}

$('#f-photo').addEventListener('change', async (e) => {
  const input = e.target;
  const file = input.files[0];
  if (!file) return;
  const error = $('#photo-error');
  clearFieldError(input, error);

  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    input.setAttribute('aria-invalid', 'true');
    error.textContent = 'Pilih foto berformat JPG atau PNG.';
    error.hidden = false;
    input.value = '';
    input.focus();
    return;
  }
  if (file.size > MAX_PHOTO_BYTES) {
    input.setAttribute('aria-invalid', 'true');
    error.textContent = 'Ukuran foto maksimal 5 MB.';
    error.hidden = false;
    input.value = '';
    input.focus();
    return;
  }

  try {
    state.contact.photo = await readPhoto(file);
    $('#photo-remove').hidden = false;
    $('#photo-status').textContent = `Foto ${file.name} ditambahkan.`;
    clearSaveStatus();
    render();
  } catch {
    input.setAttribute('aria-invalid', 'true');
    error.textContent = 'Foto tidak dapat dibaca. Pilih file JPG atau PNG yang valid.';
    error.hidden = false;
    input.focus();
  }
});

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

$('#photo-remove').addEventListener('click', () => {
  state.contact.photo = '';
  $('#f-photo').value = '';
  $('#photo-remove').hidden = true;
  $('#photo-status').textContent = 'Foto dihapus.';
  clearFieldError($('#f-photo'), $('#photo-error'));
  clearSaveStatus();
  render();
});

function move(arr, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

document.addEventListener('click', (e) => {
  const b = e.target;
  if (b.dataset.removeTag) {
    const kind = b.dataset.removeTag;
    const [removed] = state[kind].splice(Number(b.dataset.index), 1);
    const config = TAG_FIELDS[kind];
    $(`#${config.status}`).textContent = `${config.label[0].toUpperCase()}${config.label.slice(1)} ${removed} dihapus.`;
    clearSaveStatus();
    renderAll();
    $(`#${config.input}`).focus();
    return;
  }
  if (b.dataset.add || b.dataset.up || b.dataset.down || b.dataset.remove) clearSaveStatus();
  if (b.dataset.add)      { state[b.dataset.add].push({}); renderAll(); }
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

  const org = (state.organizations || []).filter(x => x.name?.trim() || x.role?.trim()).map(x => `
    <div class="item">
      <div class="item-head"><b>${esc(x.role)}</b><span class="item-dates">${esc(x.start || '')} – ${esc(x.end || 'sekarang')}</span></div>
      <div><i>${esc(x.name)}</i></div>
      <p style="margin:4px 0;white-space:pre-wrap">${esc(x.description)}</p>
    </div>`).join('');

  const edu = (state.education || []).filter(x => x.school || x.degree).map(x => `
    <div class="item">
      <div class="item-head"><b>${esc(x.degree)}</b><span class="item-dates">${esc(x.start || '')} – ${esc(x.end || '')}</span></div>
      <div>${esc(x.school)}</div>
    </div>`).join('');

  const skills = (state.skills || []).filter(s => s.trim()).map(s => `<li>${esc(s)}</li>`).join('');
  const tools = (state.tools || []).filter(tool => tool.trim()).map(tool => `<li>${esc(tool)}</li>`).join('');
  const prj = (state.projects || []).filter(x => x.name).map(x => `
    <div class="item"><div class="item-head"><b>${esc(x.name)}</b></div>
    <p style="margin:4px 0;white-space:pre-wrap">${esc(x.description)}</p></div>`).join('');

  $('#preview').innerHTML = `
    <header class="cv-header">
      ${c.photo ? `<img class="cv-photo" src="${esc(c.photo)}" alt="Foto ${esc(c.name || 'profil')}">` : ''}
      <div class="cv-heading">
        <h1>${esc(c.name || 'Nama Lengkap')}</h1>
        <div class="contact">${esc([c.email, c.phone, c.location].filter(Boolean).join(' · '))}</div>
      </div>
    </header>
    ${sec('Ringkasan', state.summary ? `<p style="white-space:pre-wrap">${esc(state.summary)}</p>` : '')}
    ${sec('Pengalaman Kerja', exp)}
    ${sec('Pengalaman Organisasi', org)}
    ${sec('Pendidikan', edu)}
    ${sec('Keterampilan', skills ? `<ul>${skills}</ul>` : '')}
    ${sec('Tools', tools ? `<ul>${tools}</ul>` : '')}
    ${sec('Proyek', prj)}
  `;
}

/* ---------- simpan (judul + isi) ke backend ---------------------- */

function validateCV() {
  const titleInput = $('#f-title');
  const nameInput = $('#f-name');
  const emailInput = $('#f-email');
  const title = titleInput.value.trim();
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const errors = [
    [titleInput, $('#f-title-error'), !title ? 'Masukkan judul CV.' : Array.from(title).length > 255 ? 'Judul CV maksimal 255 karakter.' : ''],
    [nameInput, $('#f-name-error'), !name ? 'Masukkan nama lengkap.' : ''],
    [emailInput, $('#f-email-error'), email && !emailInput.checkValidity() ? 'Masukkan email dengan format yang benar.' : ''],
  ];
  let firstInvalid = null;
  for (const [input, error, message] of errors) {
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      error.textContent = message;
      error.hidden = false;
      firstInvalid ||= input;
    } else {
      clearFieldError(input, error);
    }
  }
  firstInvalid?.focus();
  return { valid: !firstInvalid, title };
}

$('#save').addEventListener('click', async () => {
  const { valid, title } = validateCV();
  if (!valid) return;

  const button = $('#save');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  showMsg('');
  clearSaveStatus();
  try {
    const { ok, data, status } = await apiFetch(`/api/cv/${cvID}`, 'PUT', { title, data: state });
    if (!ok) {
      showMsg(data.error || (status === 404 ? 'CV tidak ditemukan.' : 'CV tidak dapat disimpan. Periksa kembali isinya dan coba lagi.'));
      return;
    }
    showSaveToast('Perubahan CV berhasil disimpan.');
  } catch {
    showMsg('Tidak dapat terhubung ke server. Periksa koneksi, lalu coba lagi.');
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
});

$('#toast-dismiss').addEventListener('click', clearSaveStatus);

$('#export').addEventListener('click', () => {
  // Opsi 1 (disetujui): ekspor via dialog print browser -> Save as PDF.
  // Hasil PDF berasal dari preview CV yang teksnya selectable.
  window.print();
});

// Logout di header
$('#logout').addEventListener('click', async () => {
  await apiFetch('/api/auth/logout', 'POST'); // sesi di database juga dihapus
  location.href = '/login';
});

loadCV();
