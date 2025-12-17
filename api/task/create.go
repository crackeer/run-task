package task

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
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

	taskID, err := container.CreateTask(task.TaskType, task.Input, task.RunEndpoint)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	err = runTask(taskID, task.RunEndpoint)
	if err != nil {
		container.CallbackTask(taskID, "error", "", err.Error())
		ctx.JSON(http.StatusOK, gin.H{"error": err.Error(), "task_id": taskID})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"task_id": taskID})
}

// RunTaskSSE 处理SSE请求
func runTask(taskID uint, endpoint string) error {

	cfg := container.GetConfig()

	query := map[string]string{
		"input":    fmt.Sprintf("%s/api/task/input/%d", cfg.AppHost, taskID),
		"output":   fmt.Sprintf("%s/api/task/output/%d", cfg.AppHost, taskID),
		"callback": fmt.Sprintf("%s/api/task/callback/%d", cfg.AppHost, taskID),
	}

	urlValues := url.Values{}
	for k, v := range query {
		urlValues.Add(k, v)
	}
	runEndpoint := fmt.Sprintf("%s?%s", endpoint, urlValues.Encode())

	result, err := http.Get(runEndpoint)
	if err != nil {
		return err
	}
	defer result.Body.Close()
	if result.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(result.Body)
		container.CallbackTask(taskID, "error", "", string(body))
		return fmt.Errorf("任务运行失败，状态码：%d，响应体：%s", result.StatusCode, string(body))
	}
	return nil
}
