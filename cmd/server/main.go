package main

// Titik masuk aplikasi. Urutan startup:
// 1. muat konfigurasi dari environment variable
// 2. buka koneksi database (GORM)
// 3. jalankan server Gin

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"cvats-opencode/internal/config"
	"cvats-opencode/internal/database"

	"github.com/joho/godotenv"
)

func main() {
	if err := loadDotEnv(); err != nil {
		log.Fatalf("gagal memuat .env: %v", err)
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("konfigurasi tidak lengkap: %v", err)
	}

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("gagal koneksi database: %v", err)
	}

	defer database.Close(db)

	database.Migrate(db)

	r := newRouter(db)

	// Deteksi PORT dari sistem Hostless, jika kosong gunakan dari config.Load()
	port := os.Getenv("PORT")
	if port == "" {
		port = fmt.Sprintf("%d", cfg.AppPort)
	}

	addr := fmt.Sprintf(":%s", port)
	log.Printf("server berjalan di http://localhost%s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server gagal berjalan: %v", err)
	}
}

func loadDotEnv() error {
	dir, err := os.Getwd()
	if err != nil {
		return err
	}

	for {
		goModPath := filepath.Join(dir, "go.mod")
		if _, statErr := os.Stat(goModPath); statErr == nil {
			envPath := filepath.Join(dir, ".env")
			if _, envErr := os.Stat(envPath); errors.Is(envErr, os.ErrNotExist) {
				return nil
			} else if envErr != nil {
				return envErr
			}
			return godotenv.Load(envPath)
		} else if !errors.Is(statErr, os.ErrNotExist) {
			return statErr
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			return godotenv.Load()
		}
		dir = parent
	}
}
