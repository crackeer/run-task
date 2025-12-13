package task

import (
	"net/http"
	"web-tool-backend/container"

	"github.com/gin-gonic/gin"
)

// CreateTask 创建任务
func CreateTask(ctx *gin.Context) {
	var task container.Task
	if err := ctx.ShouldBindJSON(&task); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	inputID, err := container.CreateInput(task.TaskType, task.Input, task.RunEndpoint, task.InputEndpoint)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"task_id": inputID})
}
