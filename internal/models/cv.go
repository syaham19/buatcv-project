// Model CV: satu dokumen CV milik satu pengguna.
//
// Isi CV (kontak, ringkasan, pengalaman, pendidikan, keterampilan,
// bagian opsional) disimpan sebagai kolom jsonb "Data". Pendekatan ini
// dipilih untuk MVP agar struktur folder dan kode sederhana; jika nanti
// butuh query per bagian, bisa dipindah ke tabel terpisah.
package models

import (
	"encoding/json"
	"time"
)

type CV struct {
	ID        uint             `gorm:"primaryKey" json:"id"`
	UserID    uint             `gorm:"index;not null" json:"user_id"`
	Title     string           `gorm:"size:255;not null" json:"title"`
	Data      json.RawMessage  `gorm:"type:jsonb" json:"data"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
}
