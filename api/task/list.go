package task

import (
	"net/http"
	"run-task/container"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetTasks 获取任务列表
func GetTasks(ctx *gin.Context) {
	// 获取查询参数
	taskType := ctx.Query("task_type")

	// 手动解析整数参数
	page := 1
	pageSize := 10

	if pageStr := ctx.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if pageSizeStr := ctx.Query("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 && ps <= 100 {
			pageSize = ps
		}
	}

	// 查询任务列表
	tasks, total, err := container.ListTasks(taskType, page, pageSize)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 返回结果
	ctx.JSON(http.StatusOK, gin.H{
		"tasks":       tasks,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
	})
}
