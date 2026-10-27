// Handler HTTP untuk register, login, logout, dan info akun.
// Semua validasi dilakukan di BACKEND, bukan cuma di frontend
// (ketentuan spesifikasi bagian 4).
package auth

import (
	"net/http"
	"regexp"
	"strings"

	"cvats-opencode/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var emailRe = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

type credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// validasiInput: email harus format valid, password min 8 karakter.
func validasiInput(cred credentials) string {
	cred.Email = strings.ToLower(strings.TrimSpace(cred.Email))
	if !emailRe.MatchString(cred.Email) {
		return "format email tidak valid"
	}
	if len(cred.Password) < 8 {
		return "password minimal 8 karakter"
	}
	return ""
}

// Register: buat akun baru. Email harus belum pernah dipakai.
func Register(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var cred credentials
		if err := c.ShouldBindJSON(&cred); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "data tidak valid"})
			return
		}
		if msg := validasiInput(cred); msg != "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": msg})
			return
		}

		hash, err := HashPassword(cred.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memproses password"})
			return
		}

		user := models.User{Email: strings.ToLower(strings.TrimSpace(cred.Email)), PasswordHash: hash}
		if err := db.Create(&user).Error; err != nil {
			// Duplikat email tertangani di sini (unique index)
			c.JSON(http.StatusConflict, gin.H{"error": "email sudah terdaftar"})
			return
		}

		if err := CreateSession(db, c.Writer, user.ID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal membuat sesi"})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"id": user.ID, "email": user.Email})
	}
}

// Login: periksa email + password, lalu buat sesi.
func Login(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var cred credentials
		if err := c.ShouldBindJSON(&cred); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "data tidak valid"})
			return
		}

		var user models.User
		if err := db.Where("email = ?", strings.ToLower(strings.TrimSpace(cred.Email))).First(&user).Error; err != nil {
			// Pesan sengaja sama untuk email salah / password salah,
			// agar tidak membocorkan email mana yang terdaftar.
			c.JSON(http.StatusUnauthorized, gin.H{"error": "email atau password salah"})
			return
		}
		if CheckPassword(cred.Password, user.PasswordHash) != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "email atau password salah"})
			return
		}

		if err := CreateSession(db, c.Writer, user.ID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal membuat sesi"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"id": user.ID, "email": user.Email})
	}
}

// Logout: hapus sesi di database + cookie di browser.
func Logout(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		DeleteSession(db, c.Writer, c.Request)
		c.JSON(http.StatusOK, gin.H{"status": "logged_out"})
	}
}

// Me: info akun yang sedang login (dipakai frontend untuk cek status login).
func Me(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, err := GetSessionUser(db, c.Request)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "belum login"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"id": user.ID, "email": user.Email})
	}
}

// RequireAuth: middleware yang MENOLAK semua request tanpa sesi valid.
// Semua endpoint CV wajib dilewati middleware ini.
func RequireAuth(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, err := GetSessionUser(db, c.Request)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "silakan login"})
			return
		}
		// Simpan pengguna di context agar handler berikutnya tahu "siapa" pemanggil
		c.Set("user", user)
		c.Next()
	}
}
