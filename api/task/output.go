package task

import (
	"fmt"
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
	lastID := ctx.DefaultQuery("last_id", "0")
	pageSize := ctx.DefaultQuery("page_size", DefaultPageSize)
	lastIDInt, _ := strconv.Atoi(lastID)
	pageSizeInt, _ := strconv.Atoi(pageSize)
	taskIDInt, _ := strconv.Atoi(taskID)
	taskOutputs, err := container.GetTaskOutput(uint(taskIDInt), lastIDInt, pageSizeInt)
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

	fmt.Printf("taskID: %s, output: %s\n", taskID, string(output))
	taskIDInt, _ := strconv.Atoi(taskID)
	err = container.CreateTaskOutput(uint(taskIDInt), string(output))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, nil)
}
