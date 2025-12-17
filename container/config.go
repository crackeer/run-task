package container

import (
	"log"

	"github.com/caarlos0/env/v11"
)

type AppConfig struct {
	Port        string `env:"PORT" envDefault:"8080"`
	FrontendDir string `env:"FRONTEND_DIR" envDefault:"./frontend"`
	TempDir     string `env:"TEMP_DIR" envDefault:"/tmp/run-task"`
	Database    string `env:"DATABASE" envDefault:"/tmp/run-task.db"`
	AppHost     string `env:"APP_HOST" envDefault:"http://localhost:8080"`
}

var (
	cfg *AppConfig
)

func InitConfig() error {
	// 从环境变量中解析配置
	cfg = &AppConfig{}
	if err := env.Parse(cfg); err != nil {
		log.Fatalf("Failed to parse environment variables: %v", err)
	}
	return nil
}

func GetConfig() *AppConfig {
	return cfg
}
