package task

import (
	"net/http"
	"strconv"
	"web-tool-backend/container"

	"github.com/gin-gonic/gin"
)

var (
	DefaultPageSize = "200"
)

func GetTaskOutput(ctx *gin.Context) {
	taskID := ctx.Param("task_id")
	page := ctx.DefaultQuery("page", "1")
	pageSize := ctx.DefaultQuery("page_size", DefaultPageSize)
	pageInt, _ := strconv.Atoi(page)
	pageSizeInt, _ := strconv.Atoi(pageSize)
	taskIDInt, _ := strconv.Atoi(taskID)
	taskOutputs, err := container.GetTaskOutput(uint(taskIDInt), pageInt, pageSizeInt)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, taskOutputs)

}

func PostTaskOutput(ctx *gin.Context) {
	taskID := ctx.Param("task_id")
	output, err := ctx.GetRawData()
	if err != nil {
		return
	}

	taskIDInt, _ := strconv.Atoi(taskID)
	err = container.CreateTaskOutput(uint(taskIDInt), string(output))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, nil)
}
