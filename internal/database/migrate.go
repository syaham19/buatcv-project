// Auto-migrate: membuat/menyesuaikan tabel sesuai model.
// Dipakai saat startup agar tabel siap tanpa file SQL terpisah.
package database

import (
	"log"

	"cvats-opencode/internal/models"

	"gorm.io/gorm"
)

func Migrate(db *gorm.DB) {
	if err := db.AutoMigrate(&models.User{}, &models.Session{}, &models.CV{}); err != nil {
		log.Fatalf("migrasi database gagal: %v", err)
	}
}
