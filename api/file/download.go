package file

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func DownloadFile(ctx *gin.Context) {
	filePath := ctx.Query("file_path")
	if filePath == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "file_path is required"})
		return
	}

	ctx.File(filePath)
}
