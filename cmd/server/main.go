package main

// Titik masuk aplikasi. Urutan startup:
// 1. muat konfigurasi dari environment variable
// 2. buka koneksi database (GORM)
// 3. jalankan server Gin

import (
	"fmt"
	"log"

	"cvats-opencode/internal/config"
	"cvats-opencode/internal/database"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("konfigurasi tidak lengkap: %v", err)
	}

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("gagal koneksi database: %v", err)
	}

	defer database.Close(db)

	r := newRouter() // Tahap 2: daftarkan route auth dan CV di sini

	addr := fmt.Sprintf(":%d", cfg.AppPort)
	log.Printf("server berjalan di http://localhost%s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server gagal berjalan: %v", err)
	}
}
