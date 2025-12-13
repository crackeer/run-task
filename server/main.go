package server

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"web-tool-backend/api"
	"web-tool-backend/api/file"
	"web-tool-backend/api/task"
	"web-tool-backend/container"

	"github.com/gin-gonic/gin"

	_ "github.com/joho/godotenv/autoload"
)

func enableCORS(ctx *gin.Context) {
	ctx.Writer.Header().Set("Access-Control-Allow-Origin", "*")
	ctx.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	ctx.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	ctx.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length")
	ctx.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
	if ctx.Request.Method == http.MethodOptions {
		ctx.AbortWithStatus(http.StatusNoContent)
		return
	}
	ctx.Next()
}

func Main() {
	// 初始化配置
	if err := container.InitConfig(); err != nil {
		log.Fatalf("Failed to initialize config: %v", err)
	}
	if err := container.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	cfg := container.GetConfig()

	// 创建 Gin 实例
	router := gin.Default()
	router.Use(enableCORS)

	apiGroup := router.Group("/api")
	{
		apiGroup.GET("/run", api.RunTaskSSE)
		apiGroup.GET("/task/config/list", task.GetTaskConfigList)
		apiGroup.POST("/task/config/create", task.CreateTaskConfig)
		apiGroup.POST("/task/config/update", task.UpdateTaskConfig)
		apiGroup.POST("/task/config/delete", task.DeleteTaskConfig)

		apiGroup.POST("/task/create", task.CreateTask)
		apiGroup.GET("/task/list", task.GetTasks)
		apiGroup.POST("/task/delete", task.DeleteTask)
		apiGroup.GET("/task/detail", task.GetTaskByID)
		apiGroup.POST("/upload", file.UploadFile)
		apiGroup.GET("/download", file.DownloadFile)
	}

	router.NoRoute(func(ctx *gin.Context) {
		fullPath := filepath.Join(cfg.FrontendDir, ctx.Request.URL.Path)
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			ctx.File(filepath.Join(cfg.FrontendDir, "index.html"))
			return
		}
		fileServer := http.StripPrefix("", http.FileServer(http.Dir(cfg.FrontendDir)))
		fileServer.ServeHTTP(ctx.Writer, ctx.Request)
	})

	// 启动服务器
	router.Run(":" + cfg.Port)
}
