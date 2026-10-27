// Model User: tabel untuk akun pengguna.
package models

import "time"

type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Email        string    `gorm:"uniqueIndex;size:255;not null" json:"email"`
	PasswordHash string    `gorm:"size:255;not null" json:"-"` // tidak pernah dikirim ke frontend
	CreatedAt    time.Time `json:"created_at"`
}
