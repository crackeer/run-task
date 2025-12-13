package api

import (
	"net/http"
	"web-tool-backend/container"

	"github.com/gin-gonic/gin"
)

func GetConfig(ctx *gin.Context) {
	cfg := container.GetConfig()
	ctx.JSON(http.StatusOK, cfg)
}
