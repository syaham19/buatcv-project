// Model Session: sesi login yang disimpan di database (server-side).
// Cookie browser hanya membawa token acak, bukan data pengguna.
package models

import "time"

type Session struct {
	Token     string    `gorm:"primaryKey;size:64"`
	UserID    uint      `gorm:"index;not null"`
	ExpiresAt time.Time `gorm:"index;not null"`
	CreatedAt time.Time
}
