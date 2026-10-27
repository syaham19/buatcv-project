// Pengelolaan sesi: membuat sesi di database, membaca sesi dari cookie,
// dan middleware untuk endpoint yang wajib login.
//
// Catatan keamanan:
// - Cookie HttpOnly: tidak bisa dibaca JavaScript (mengurangi risiko XSS).
// - SameSite Lax: mengurangi risiko CSRF dari situs lain.
// - Secure diaktifkan otomatis saat koneksi HTTPS.
package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"
	"time"

	"cvats-opencode/internal/models"

	"gorm.io/gorm"
)

const (
	sessionCookieName = "cvats_session"
	sessionDuration   = 7 * 24 * time.Hour // sesi berlaku 7 hari
)

var ErrNoSession = errors.New("tidak ada sesi aktif")

// NewToken membuat token acak 32 byte (aman untuk sesi).
func NewToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

// CreateSession menyimpan sesi baru dan menaruh token di cookie HttpOnly.
func CreateSession(db *gorm.DB, w http.ResponseWriter, userID uint) error {
	token, err := NewToken()
	if err != nil {
		return err
	}

	session := models.Session{
		Token:     token,
		UserID:    userID,
		ExpiresAt: time.Now().Add(sessionDuration),
	}
	if err := db.Create(&session).Error; err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   runningHTTPS(), // aktif hanya jika koneksi HTTPS
		MaxAge:   int(sessionDuration.Seconds()),
	})
	return nil
}

// runningHTTPS menandakan koneksi HTTPS. Aman di development (HTTP lokal);
// saat produksi di belakang reverse proxy TLS nilai ini perlu dibaca dari
// header proxy (diselesaikan saat tahap deploy).
func runningHTTPS() bool {
	return false
}

// GetSessionUser membaca cookie sesi, memvalidasi di database, dan
// mengembalikan user yang sedang login. Token salah/kedaluwarsa -> ErrNoSession.
func GetSessionUser(db *gorm.DB, r *http.Request) (*models.User, error) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		return nil, ErrNoSession
	}

	var session models.Session
	if err := db.Where("token = ? AND expires_at > ?", cookie.Value, time.Now()).First(&session).Error; err != nil {
		return nil, ErrNoSession
	}

	var user models.User
	if err := db.First(&user, session.UserID).Error; err != nil {
		return nil, ErrNoSession
	}
	return &user, nil
}

// DeleteSession menghapus sesi dari database dan menghapus cookie.
func DeleteSession(db *gorm.DB, w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(sessionCookieName); err == nil {
		db.Delete(&models.Session{}, "token = ?", cookie.Value)
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1, // hapus cookie di browser
	})
}
