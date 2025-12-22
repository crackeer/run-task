package server

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"run-task/api/file"
	"run-task/api/task"
	"run-task/container"

	"github.com/gin-gonic/gin"

	_ "github.com/joho/godotenv/autoload"
)

func CORS() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		ctx.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		ctx.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		ctx.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		ctx.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length")
		ctx.Writer.Header().Set("Access-Control-Allow-Credentials", "true")

		if ctx.Request.Method == http.MethodOptions {
			ctx.AbortWithStatus(http.StatusNoContent)
			return
		}

		ctx.Next()
	}
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
	router.Use(CORS())
	apiGroup := router.Group("/api")
	{
		apiGroup.GET("/task/config/list", task.GetTaskConfigList)
		apiGroup.POST("/task/config/create", task.CreateTaskConfig)
		apiGroup.POST("/task/config/update", task.UpdateTaskConfig)
		apiGroup.POST("/task/config/delete", task.DeleteTaskConfig)

		apiGroup.POST("/task/create", task.CreateTask)
		apiGroup.GET("/task/list", task.GetTasks)
		apiGroup.POST("/task/delete", task.DeleteTask)
		apiGroup.GET("/task/detail", task.GetTaskByID)

		apiGroup.GET("/task/input/:task_id", task.GetTaskInput)
		apiGroup.POST("/task/output/:task_id", task.PostTaskOutput)
		apiGroup.GET("/task/output/:task_id", task.GetTaskOutput)

		apiGroup.POST("/task/callback/:task_id", task.Callback)

		apiGroup.POST("/file/upload", file.UploadFile)
		apiGroup.GET("/file/get/*path", file.DownloadFile)
		apiGroup.GET("/file/list", file.ListFiles)
		apiGroup.POST("/file/delete", file.DeleteFile)
	}

	router.NoRoute(gin.BasicAuth(gin.Accounts{
		cfg.Username: cfg.Password,
	}), func(ctx *gin.Context) {
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
