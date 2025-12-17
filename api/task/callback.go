package task

import (
	"fmt"
	"net/http"
	"strconv"
	"web-tool-backend/container"

	"github.com/gin-gonic/gin"
)

type CallbackRequest struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Result  string `json:"result"`
}

func Callback(ctx *gin.Context) {
	taskIDStr := ctx.Param("task_id")
	taskID, _ := strconv.Atoi(taskIDStr)
	task := container.GetTask(uint(taskID))
	fmt.Printf("task: %v\n", task)
	if task == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "任务不存在"})
		return
	}
	var callback CallbackRequest
	if err := ctx.ShouldBindJSON(&callback); err != nil {
		fmt.Printf("err: %v\n", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	container.CallbackTask(task.ID, callback.Status, callback.Message, callback.Result)
	ctx.JSON(http.StatusOK, gin.H{"message": "回调成功"})
}
