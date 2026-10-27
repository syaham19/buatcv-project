// Setup router Gin. Pada Tahap 1 hanya placeholder: satukan endpoint
// kesehatan aplikasi. Routing untuk auth dan CV ditambahkan di tahap berikutnya.
package main

import (
	"net/http"

	"cvats-opencode/internal/auth"
	"cvats-opencode/internal/cv"

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

	// Endpoint CV (wajib login: Ownership check via RequireAuth)
	cvGroup := r.Group("/api/cv", auth.RequireAuth(db))
	{
		cvGroup.GET("", cv.List(db))
		cvGroup.POST("", cv.Create(db))
		cvGroup.GET("/:id", cv.Get(db))
		cvGroup.PUT("/:id", cv.Update(db))
		cvGroup.DELETE("/:id", cv.Delete(db))
	}

	// Folder static: landing, login, dashboard, editor, preview, CSS, JS
	r.Static("/static", "./static")

	// Tambahkan rute halaman (page route) di tahap frontend

	return r
}
