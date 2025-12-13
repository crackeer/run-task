package file

import (
	"net/http"
	"os"
	"path/filepath"
	"web-tool-backend/container"

	"github.com/gin-gonic/gin"
)

func UploadFile(ctx *gin.Context) {
	file, err := ctx.FormFile("file")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cfg := container.GetConfig()

	// 保存文件到临时目录
	tempPath := filepath.Join(cfg.TempDir, file.Filename)
	if err := os.MkdirAll(filepath.Dir(tempPath), os.ModePerm); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := ctx.SaveUploadedFile(file, tempPath); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "File uploaded successfully", "path": tempPath})
}
