# Project Specification --- ATS CV Generator

> Status: keputusan teknologi sudah disetujui pemilik proyek, lihat tabel di bawah.

## Keputusan yang Disetujui

| Aspek | Keputusan |
|---|---|
| Nama aplikasi | ATS CV Generator |
| Akun & autentikasi | Ya, register/login/logout — session server + cookie HttpOnly/Secure/SameSite |
| Backend | Go + Gin |
| Database | PostgreSQL, akses via GORM |
| Frontend | HTML/CSS/JS murni, disajikan langsung oleh Gin |
| Chatbot AI | Tidak masuk MVP (tahap berikutnya) |
| Ekspor | PDF saja, teks dapat dipilih |
| Landing page | Ada |
| Version control | Git |

## Ringkasan Fitur MVP

1. Landing page.
2. Register, login, logout.
3. Dashboard / daftar CV.
4. Form editor CV: kontak, foto profil opsional, ringkasan, pengalaman kerja,
   pengalaman organisasi opsional, pendidikan, keterampilan, tools, dan bagian
   opsional. Entri berulang bisa ditambah, diedit, dihapus, dan diurutkan.
5. Preview CV yang mendekati hasil ekspor.
6. Simpan CV ke database per pengguna.
7. Ekspor PDF dengan teks selectable.
8. Hapus CV dengan konfirmasi.

## Aturan Keamanan

- Backend memverifikasi sesi dan kepemilikan CV (`user_id`) pada setiap
  endpoint baca/edit/hapus/ekspor.
- Password di-hash dengan algoritma khusus password.
- Validasi data di backend meskipun frontend juga memvalidasi.
- Rahasia hanya dibaca dari environment variable; `.env` di `.gitignore`;
  sediakan `.env.example` tanpa kredensial asli.
- Tidak ada janji bahwa CV pasti lolos ATS.
- Fitur di luar MVP: pembayaran, marketplace template, tracking lamaran,
  surat lamaran auto, impor LinkedIn, berbagi publik, kolaborasi,
  integrasi job board.
