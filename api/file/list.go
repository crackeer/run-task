package file

import (
	"net/http"
	"os"
	"path/filepath"
	"run-task/container"
	"time"

	"github.com/gin-gonic/gin"
)

// FileInfo 表示文件信息的结构体
type FileInfo struct {
	Name         string    `json:"name"`          // 文件名
	Path         string    `json:"path"`          // 文件路径
	Size         int64     `json:"size"`          // 文件大小（字节）
	ModTime      time.Time `json:"mod_time"`      // 修改时间
	IsDir        bool      `json:"is_dir"`        // 是否为目录
	RelativePath string    `json:"relative_path"` // 相对于TempDir的路径
	DownloadURL  string    `json:"download_url"`  // 完整的下载URL
}

// ListFiles 获取默认上传文件夹及其子文件夹下的文件列表
func ListFiles(ctx *gin.Context) {
	// 获取配置中的临时目录
	cfg := container.GetConfig()
	tempDir := cfg.TempDir

	// 检查临时目录是否存在
	if _, err := os.Stat(tempDir); os.IsNotExist(err) {
		ctx.JSON(http.StatusOK, gin.H{
			"code":    0,
			"message": "文件夹不存在",
			"files":   []FileInfo{},
		})
		return
	}

	// 存储文件列表
	var files []FileInfo

	// 遍历临时目录及其子目录
	err := filepath.Walk(tempDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// 计算相对路径
		relativePath, err := filepath.Rel(tempDir, path)
		if err != nil {
			return err
		}

		// 创建文件信息
		fileInfo := FileInfo{
			Name:         info.Name(),
			Path:         path,
			Size:         info.Size(),
			ModTime:      info.ModTime(),
			IsDir:        info.IsDir(),
			RelativePath: relativePath,
			DownloadURL:  cfg.AppHost + "/api/file/get" + path,
		}
		if info.IsDir() {
			return nil
		}

		// 添加到文件列表
		files = append(files, fileInfo)
		return nil
	})

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"code":    -1,
			"message": "获取文件列表失败",
			"error":   err.Error(),
		})
		return
	}

	// 返回文件列表
	ctx.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "获取文件列表成功",
		"files":   files,
		"total":   len(files),
	})
}
