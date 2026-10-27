// Setup router Gin. Pada Tahap 1 hanya placeholder: satukan endpoint
// kesehatan aplikasi. Routing untuk auth dan CV ditambahkan di tahap berikutnya.
package main

import (
	"net/http"

	"cvats-opencode/internal/auth"
	"cvats-opencode/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func newRouter(db *gorm.DB) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// Endpoint untuk memastikan server dan koneksi database hidup
	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Endpoint autentikasi
	authGroup := r.Group("/api/auth")
	{
		authGroup.POST("/register", auth.Register(db))
		authGroup.POST("/login", auth.Login(db))
		authGroup.POST("/logout", auth.Logout(db))
		authGroup.GET("/me", auth.Me(db))
	}

	// Contoh endpoint terlindungi (bukti middleware bekerja)
	r.GET("/api/protected", auth.RequireAuth(db), func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		c.JSON(http.StatusOK, gin.H{"message": "halo " + user.Email})
	})

	return r
}
