package file

import (
	"net/http"
	"os"
	"path/filepath"
	"run-task/container"

	"github.com/gin-gonic/gin"
)

// DeleteFile 删除指定路径的文件
func DeleteFile(ctx *gin.Context) {
	// 获取配置中的临时目录
	cfg := container.GetConfig()
	tempDir := cfg.TempDir

	// 获取要删除的文件的相对路径
	relativePath := ctx.Query("relative_path")
	if relativePath == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"code":    -1,
			"message": "relative_path参数是必需的",
		})
		return
	}

	// 构建完整的文件路径
	filePath := filepath.Join(tempDir, relativePath)

	// 验证文件是否存在
	fileInfo, err := os.Stat(filePath)
	if os.IsNotExist(err) {
		ctx.JSON(http.StatusOK, gin.H{
			"code":    -1,
			"message": "文件不存在",
		})
		return
	}

	// 验证路径是否为目录
	if fileInfo.IsDir() {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"code":    -1,
			"message": "不能删除目录",
		})
		return
	}

	// 执行删除操作
	err = os.Remove(filePath)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"code":    -1,
			"message": "删除文件失败",
			"error":   err.Error(),
		})
		return
	}

	// 返回成功响应
	ctx.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "删除文件成功",
	})
}
