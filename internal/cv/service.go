// Package cv: logika bisnis dan aturan kepemilikan CV.
//
// ATURAN WAJIB (ketentuan spesifikasi): pengguna tidak boleh membaca,
// mengedit, atau menghapus CV milik orang lain, termasuk dengan
// mengganti ID di URL. Karena itu semua fungsi di sini MENERIMA userID
// dari sesi (bukan dari request pengguna) dan memfilter query dengan
// user_id tersebut.
package cv

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"regexp"
	"strings"
	"unicode/utf8"

	"cvats-opencode/internal/models"

	"gorm.io/gorm"
)

var (
	ErrNotFound = errors.New("cv tidak ditemukan")
	ErrInvalid  = errors.New("data cv tidak valid")
)

var emailRe = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

const maxPhotoBytes = 5 * 1024 * 1024

// validasi: judul dan nama wajib, email opsional tetapi harus valid jika diisi.
func validasi(title string, data []byte) error {
	return validasiCV(title, data, true)
}

func validasiCV(title string, data []byte, requireName bool) error {
	if strings.TrimSpace(title) == "" || utf8.RuneCountInString(strings.TrimSpace(title)) > 255 {
		return ErrInvalid
	}
	if len(data) == 0 || !jsonValid(data) {
		return ErrInvalid
	}
	var cvData struct {
		Contact struct {
			Name  string `json:"name"`
			Email string `json:"email"`
			Photo string `json:"photo"`
		} `json:"contact"`
	}
	if err := json.Unmarshal(data, &cvData); err != nil {
		return ErrInvalid
	}
	if requireName && strings.TrimSpace(cvData.Contact.Name) == "" {
		return ErrInvalid
	}
	email := strings.TrimSpace(cvData.Contact.Email)
	if email != "" && !emailRe.MatchString(email) {
		return ErrInvalid
	}
	if photo := cvData.Contact.Photo; photo != "" {
		var prefix string
		expectedFormat := ""
		switch {
		case strings.HasPrefix(photo, "data:image/jpeg;base64,"):
			prefix = "data:image/jpeg;base64,"
			expectedFormat = "jpeg"
		case strings.HasPrefix(photo, "data:image/png;base64,"):
			prefix = "data:image/png;base64,"
			expectedFormat = "png"
		default:
			return ErrInvalid
		}
		encoded := strings.TrimPrefix(photo, prefix)
		if len(encoded) > base64.StdEncoding.EncodedLen(maxPhotoBytes) {
			return ErrInvalid
		}
		imageData, err := base64.StdEncoding.DecodeString(encoded)
		if err != nil || len(imageData) > maxPhotoBytes {
			return ErrInvalid
		}
		if _, format, err := image.DecodeConfig(bytes.NewReader(imageData)); err != nil || format != expectedFormat {
			return ErrInvalid
		}
	}
	return nil
}

// jsonValid memastikan payload tersimpan adalah JSON yang sah.
func jsonValid(data []byte) bool {
	return json.Valid(data)
}

// create: CV baru milik userID.
func create(db *gorm.DB, userID uint, title string, data []byte) (*models.CV, error) {
	if err := validasiCV(title, data, false); err != nil {
		return nil, err
	}
	doc := &models.CV{UserID: userID, Title: strings.TrimSpace(title), Data: data}
	if err := db.Create(doc).Error; err != nil {
		return nil, err
	}
	return doc, nil
}

// list: semua CV milik userID saja.
func list(db *gorm.DB, userID uint) ([]models.CV, error) {
	var docs []models.CV
	err := db.Where("user_id = ?", userID).Order("updated_at DESC").Find(&docs).Error
	return docs, err
}

// get: satu CV milik userID. ID milik orang lain = tidak ditemukan.
func get(db *gorm.DB, userID, cvID uint) (*models.CV, error) {
	var doc models.CV
	err := db.Where("id = ? AND user_id = ?", cvID, userID).First(&doc).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &doc, err
}

// update: judul/isi CV milik userID. CV milik orang lain = ditolak.
func update(db *gorm.DB, userID, cvID uint, title string, data []byte) (*models.CV, error) {
	if err := validasi(title, data); err != nil {
		return nil, err
	}
	doc, err := get(db, userID, cvID)
	if err != nil {
		return nil, err
	}
	doc.Title = strings.TrimSpace(title)
	doc.Data = data
	if err := db.Save(doc).Error; err != nil {
		return nil, err
	}
	return doc, nil
}

// delete: hapus CV milik userID. CV milik orang lain = ditolak.
func deleteCV(db *gorm.DB, userID, cvID uint) error {
	res := db.Where("id = ? AND user_id = ?", cvID, userID).Delete(&models.CV{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}
