package task

import (
	"net/http"
	"strconv"
	"web-tool-backend/container"

	"github.com/gin-gonic/gin"
)

func GetTaskByID(ctx *gin.Context) {
	// 获取路径参数中的任务ID
	idStr := ctx.Query("task_id")
	if idStr == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "任务ID不能为空"})
		return
	}

	// 调用获取任务函数
	taskID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}
	task := container.GetTask(uint(taskID))
	if task == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "任务不存在"})
		return
	}

	ctx.JSON(http.StatusOK, task)
}
