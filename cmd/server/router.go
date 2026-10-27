// Setup router Gin. Pada Tahap 1 hanya placeholder: satukan endpoint
// kesehatan aplikasi. Routing untuk auth dan CV ditambahkan di tahap berikutnya.
package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func newRouter() *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// Endpoint untuk memastikan server dan koneksi database hidup
	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	return r
}
