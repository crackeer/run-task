package task

import (
	"net/http"
	"strconv"
	"web-tool-backend/container"

	"github.com/gin-gonic/gin"
)

// DeleteTask 删除任务
func DeleteTask(ctx *gin.Context) {
	// 获取路径参数中的任务ID
	idStr := ctx.Query("task_id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	// 调用删除任务函数
	if err := container.DeleteTask(uint(id)); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "任务删除成功"})
}
