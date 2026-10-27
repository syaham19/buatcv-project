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

	addr := fmt.Sprintf(":%d", cfg.AppPort)
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
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			envPath := filepath.Join(dir, ".env")
			if _, err := os.Stat(envPath); errors.Is(err, os.ErrNotExist) {
				return nil
			} else if err != nil {
				return err
			}
			return godotenv.Load(envPath)
		} else if err != nil && !errors.Is(err, os.ErrNotExist) {
			return err
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			return godotenv.Load()
		}
		dir = parent
	}
}
