package task

import (
	"encoding/json"
	"net/http"
	"strconv"
	"web-tool-backend/container"

	"github.com/gin-gonic/gin"
)

func GetTaskInput(ctx *gin.Context) {
	taskID := ctx.Param("task_id")
	taskIDInt, _ := strconv.Atoi(taskID)
	input := container.GetTask(uint(taskIDInt))
	if input == nil {
		ctx.JSON(http.StatusOK, gin.H{})
		return
	}
	var inputObj map[string]interface{} = map[string]interface{}{}
	if err := json.Unmarshal([]byte(input.Input), &inputObj); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, inputObj)
}
