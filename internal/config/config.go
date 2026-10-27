// Package config membaca konfigurasi aplikasi dari environment variable.
// Nilai rahasia tidak boleh ditulis langsung di kode (ketentuan spesifikasi).
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	AppPort      int    // port HTTP, contoh: 8080
	DatabaseURL  string // connection string PostgreSQL, contoh: postgres://user:pass@localhost:5432/cvats
	SessionSecret string // kunci untuk menandai cookie sesi (dipakai di Tahap 2)
}

// Load membaca dan memvalidasi environment variable wajib.
// Pesan error menyebutkan variabel yang hilang, tetapi TIDAK menampilkan nilainya.
func Load() (*Config, error) {
	cfg := &Config{
		AppPort: 8080, // default jika APP_PORT tidak diisi
	}

	if v, ok := os.LookupEnv("APP_PORT"); ok {
		port, err := strconv.Atoi(v)
		if err != nil || port <= 0 || port > 65535 {
			return nil, fmt.Errorf("APP_PORT harus berupa nomor port yang valid")
		}
		cfg.AppPort = port
	}

	cfg.DatabaseURL = os.Getenv("DATABASE_URL")
	if cfg.DatabaseURL == "" {
		return nil, errors.New("DATABASE_URL belum diset (lihat .env.example)")
	}

	cfg.SessionSecret = os.Getenv("SESSION_SECRET")
	if cfg.SessionSecret == "" {
		return nil, errors.New("SESSION_SECRET belum diset")
	}

	return cfg, nil
}
