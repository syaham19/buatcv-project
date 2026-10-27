package cv

import (
	"bytes"
	"encoding/base64"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"strings"
	"testing"
)

func TestValidasiCV(t *testing.T) {
	var jpegImage bytes.Buffer
	sourceImage := image.NewRGBA(image.Rect(0, 0, 1, 1))
	sourceImage.Set(0, 0, color.White)
	if err := jpeg.Encode(&jpegImage, sourceImage, nil); err != nil {
		t.Fatalf("jpeg.Encode() error = %v", err)
	}
	validPhoto := base64.StdEncoding.EncodeToString(jpegImage.Bytes())

	tests := []struct {
		name  string
		title string
		data  string
		valid bool
	}{
		{name: "data lengkap", title: "CV Saya", data: `{"contact":{"name":"Ayu"}}`, valid: true},
		{name: "email opsional", title: "CV Saya", data: `{"contact":{"name":"Ayu","email":""}}`, valid: true},
		{name: "foto jpg valid", title: "CV Saya", data: fmt.Sprintf(`{"contact":{"name":"Ayu","photo":"data:image/jpeg;base64,%s"}}`, validPhoto), valid: true},
		{name: "foto png valid", title: "CV Saya", data: `{"contact":{"name":"Ayu","photo":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC"}}`, valid: true},
		{name: "tools", title: "CV Saya", data: `{"contact":{"name":"Ayu"},"tools":["Figma","Microsoft Excel"]}`, valid: true},
		{name: "judul kosong", title: "  ", data: `{"contact":{"name":"Ayu"}}`},
		{name: "judul terlalu panjang", title: strings.Repeat("a", 256), data: `{"contact":{"name":"Ayu"}}`},
		{name: "nama kosong", title: "CV Saya", data: `{"contact":{"name":" "}}`},
		{name: "email tidak valid", title: "CV Saya", data: `{"contact":{"name":"Ayu","email":"salah"}}`},
		{name: "foto format tidak didukung", title: "CV Saya", data: `{"contact":{"name":"Ayu","photo":"data:image/svg+xml;base64,PHN2Zz4="}}`},
		{name: "foto bukan jpeg", title: "CV Saya", data: `{"contact":{"name":"Ayu","photo":"data:image/jpeg;base64,SGVsbG8="}}`},
		{name: "foto terlalu besar", title: "CV Saya", data: fmt.Sprintf(`{"contact":{"name":"Ayu","photo":"data:image/png;base64,%s"}}`, strings.Repeat("A", base64.StdEncoding.EncodedLen(maxPhotoBytes+1)))},
		{name: "json tidak valid", title: "CV Saya", data: `{"contact":`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validasi(tt.title, []byte(tt.data))
			if tt.valid && err != nil {
				t.Fatalf("validasi() error = %v, ingin nil", err)
			}
			if !tt.valid && !errors.Is(err, ErrInvalid) {
				t.Fatalf("validasi() error = %v, ingin ErrInvalid", err)
			}
		})
	}
}
