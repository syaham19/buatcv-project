// Helper fetch ke backend (kirim/terima JSON + cookie otomatis).
// Jika sesi habis (401), arahkan pengguna ke halaman login.

async function apiFetch(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !location.pathname.endsWith('login.html')) {
    location.href = 'login.html';
    return { ok: false, data: { error: 'belum login' } };
  }

  let data = {};
  try { data = await res.json(); } catch { /* body kosong juga sah */ }
  return { ok: res.ok, status: res.status, data };
}

// Helper singkatan DOM
function $(sel) { return document.querySelector(sel); }
function $els(sel) { return Array.from(document.querySelectorAll(sel)); }
function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function showMsg(msg) {
  const el = $('#msg');
  if (!el) return;
  el.textContent = msg;
  el.hidden = !msg;
}
