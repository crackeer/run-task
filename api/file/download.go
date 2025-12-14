package file

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func DownloadFile(ctx *gin.Context) {
	filePath := ctx.Param("path")
	if filePath == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "file_path is required"})
		return
	}

	if file, err := os.Stat(filePath); err == nil && file.IsDir() {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "file_path is directory"})
		return
	}

	ctx.File(filePath)
}
