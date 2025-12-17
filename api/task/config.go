package task

import (
	"net/http"
	"run-task/container"

	"github.com/gin-gonic/gin"
)

func GetTaskConfigList(ctx *gin.Context) {
	configList, err := container.GetTaskConfigList()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, configList)
}

func CreateTaskConfig(ctx *gin.Context) {
	var config container.TaskConfig
	if err := ctx.ShouldBindJSON(&config); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := container.CreateTaskConfig(&config); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, config)
}

func DeleteTaskConfig(ctx *gin.Context) {
	var config container.TaskConfig
	if err := ctx.ShouldBindJSON(&config); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := container.DeleteTaskConfig(config.TaskType); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "Task config deleted successfully"})
}

func UpdateTaskConfig(ctx *gin.Context) {
	var config container.TaskConfig
	if err := ctx.ShouldBindJSON(&config); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := container.UpdateTaskConfig(config.TaskType, &config); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, config)
}
