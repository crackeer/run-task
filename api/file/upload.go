package file

import (
	"net/http"
	"os"
	"path/filepath"
	"run-task/container"
	"time"

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
	tempPath := filepath.Join(cfg.TempDir, time.Now().Format("20060102150405"), file.Filename)
	if err := os.MkdirAll(filepath.Dir(tempPath), os.ModePerm); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": -1})
		return
	}
	if err := ctx.SaveUploadedFile(file, tempPath); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": -1})
		return
	}

	downloadURL := cfg.AppHost + "/api/file" + tempPath
	ctx.JSON(http.StatusOK, gin.H{"message": "File uploaded successfully", "path": tempPath, "code": 0, "url": downloadURL})
}
