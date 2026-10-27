// Handler HTTP CRUD CV. Semua rute harus dilewati RequireAuth agar
// userID diambil dari SESI (kapan pun diganti ID CV di URL, query tetap
// dibatasi milik pengguna yang sedang login).
package cv

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"cvats-opencode/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type payload struct {
	Title string          `json:"title"`
	Data  json.RawMessage `json:"data"`
}

// UserIDFromContext mengambil pengguna dari sesi (dipasang RequireAuth).
func UserIDFromContext(c *gin.Context) (uint, bool) {
	user, ok := c.Get("user")
	if !ok {
		return 0, false
	}
	u, ok := user.(*models.User)
	if !ok {
		return 0, false
	}
	return u.ID, true
}

func List(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := UserIDFromContext(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "silakan login"})
			return
		}
		docs, err := list(db, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil daftar cv"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"items": docs})
	}
}

func Create(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := UserIDFromContext(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "silakan login"})
			return
		}
		var p payload
		if err := c.ShouldBindJSON(&p); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "data tidak valid"})
			return
		}
		doc, err := create(db, userID, p.Title, p.Data)
		switch {
		case errors.Is(err, ErrInvalid):
			c.JSON(http.StatusBadRequest, gin.H{"error": "judul dan isi wajib ada"})
			return
		case err != nil:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyimpan cv"})
			return
		}
		c.JSON(http.StatusCreated, doc)
	}
}

func getID(c *gin.Context) (uint, bool) {
	id64, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id64 == 0 {
		return 0, false
	}
	return uint(id64), true
}

func Get(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := UserIDFromContext(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "silakan login"})
			return
		}
		id, ok := getID(c)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "id tidak valid"})
			return
		}
		doc, err := get(db, userID, id)
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "cv tidak ditemukan"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil cv"})
			return
		}
		c.JSON(http.StatusOK, doc)
	}
}

func Update(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := UserIDFromContext(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "silakan login"})
			return
		}
		id, ok := getID(c)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "id tidak valid"})
			return
		}
		var p payload
		if err := c.ShouldBindJSON(&p); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "data tidak valid"})
			return
		}
		doc, err := update(db, userID, id, p.Title, p.Data)
		switch {
		case errors.Is(err, ErrNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "cv tidak ditemukan"})
			return
		case errors.Is(err, ErrInvalid):
			c.JSON(http.StatusBadRequest, gin.H{"error": "judul dan isi wajib ada"})
			return
		case err != nil:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyimpan cv"})
			return
		}
		c.JSON(http.StatusOK, doc)
	}
}

func Delete(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := UserIDFromContext(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "silakan login"})
			return
		}
		id, ok := getID(c)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "id tidak valid"})
			return
		}
		err := deleteCV(db, userID, id)
		switch {
		case errors.Is(err, ErrNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "cv tidak ditemukan"})
			return
		case err != nil:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menghapus cv"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "deleted"})
	}
}
