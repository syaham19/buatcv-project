// Package cv: logika bisnis dan aturan kepemilikan CV.
//
// ATURAN WAJIB (ketentuan spesifikasi): pengguna tidak boleh membaca,
// mengedit, atau menghapus CV milik orang lain, termasuk dengan
// mengganti ID di URL. Karena itu semua fungsi di sini MENERIMA userID
// dari sesi (bukan dari request pengguna) dan memfilter query dengan
// user_id tersebut.
package cv

import (
	"encoding/json"
	"errors"
	"unicode/utf8"

	"cvats-opencode/internal/models"

	"gorm.io/gorm"
)

var (
	ErrNotFound = errors.New("cv tidak ditemukan")
	ErrInvalid  = errors.New("data cv tidak valid")
)

// validasi: judul wajib ada dan Data harus JSON yang sah.
func validasi(title string, data []byte) error {
	if len(title) == 0 || utf8.RuneCountInString(title) > 255 {
		return ErrInvalid
	}
	if len(data) == 0 || !jsonValid(data) {
		return ErrInvalid
	}
	return nil
}

// jsonValid memastikan payload tersimpan adalah JSON yang sah.
func jsonValid(data []byte) bool {
	return json.Valid(data)
}

// create: CV baru milik userID.
func create(db *gorm.DB, userID uint, title string, data []byte) (*models.CV, error) {
	if err := validasi(title, data); err != nil {
		return nil, err
	}
	doc := &models.CV{UserID: userID, Title: title, Data: data}
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
	doc.Title = title
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
