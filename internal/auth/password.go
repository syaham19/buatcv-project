// Package auth: hash dan verifikasi password.
// Password tidak pernah disimpan dalam teks biasa (ketentuan spesifikasi).
package auth

import "golang.org/x/crypto/bcrypt"

// HashPassword membuat hash bcrypt dari password pengguna.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword membandingkan password yang diketik dengan hash tersimpan.
// Mengembalikan nil jika cocok.
func CheckPassword(password, hash string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
