package api

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"web-tool-backend/container"

	"github.com/gin-gonic/gin"
)

// RunTaskSSE 处理SSE请求
func RunTaskSSE(ctx *gin.Context) {

	taskIDStr := ctx.Query("task_id")
	taskIDInt, _ := strconv.Atoi(taskIDStr)
	task := container.GetTask(uint(taskIDInt))
	if task == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "任务不存在"})
		return
	}

	if len(task.RunEndpoint) < 1 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "任务没有运行端点"})
		return
	}
	cfg := container.GetConfig()

	query := map[string]string{
		"input":    fmt.Sprintf("%s/api/task/input/%s", cfg.AppHost, taskIDStr),
		"output":   fmt.Sprintf("%s/api/task/output/%s", cfg.AppHost, taskIDStr),
		"callback": fmt.Sprintf("%s/api/task/callback/%s", cfg.AppHost, taskIDStr),
	}

	urlValues := url.Values{}
	for k, v := range query {
		urlValues.Add(k, v)
	}
	runEndpoint := fmt.Sprintf("%s?%s", task.RunEndpoint, urlValues.Encode())

	result, err := http.Get(runEndpoint)
	if err != nil {
		container.CallbackTask(uint(taskIDInt), "error", "", err.Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer result.Body.Close()
	if result.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(result.Body)
		container.CallbackTask(uint(taskIDInt), "error", "", string(body))
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": result.Status})
		return
	}
}
