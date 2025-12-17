package container

import (
	"fmt"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

var db *gorm.DB

// Task 定义Task结构体，对应task表
type Task struct {
	ID          uint      `gorm:"autoIncrement;column:id" json:"id"`
	TaskType    string    `gorm:"column:task_type" json:"task_type"`
	Input       string    `gorm:"column:input" json:"input"`
	CreateTime  time.Time `gorm:"column:create_time" json:"create_time"`
	RunEndpoint string    `gorm:"column:run_endpoint" json:"run_endpoint"`
	Status      string    `gorm:"column:status" json:"status"`
	Result      string    `gorm:"column:result" json:"result"`
	Message     string    `gorm:"column:message" json:"message"`
}

// 设置表名
func (Task) TableName() string {
	return "task"
}

type TaskOutput struct {
	ID         uint      `gorm:"autoIncrement;column:id" json:"id"`
	TaskID     uint      `gorm:"column:task_id" json:"task_id"`
	Output     string    `gorm:"column:output" json:"output"`
	CreateTime time.Time `gorm:"column:create_time" json:"create_time"`
}

func (TaskOutput) TableName() string {
	return "task_output"
}

type TaskConfig struct {
	TaskType    string `gorm:"column:task_type" json:"task_type"`
	Title       string `gorm:"column:title" json:"title"`
	Form        string `gorm:"column:form" json:"form"`
	RunEndpoint string `gorm:"column:run_endpoint" json:"run_endpoint"`
}

// 设置表名
func (TaskConfig) TableName() string {
	return "task_config"
}

func InitDB() error {
	var err error
	db, err = gorm.Open(sqlite.Open(GetConfig().SQLLiteDB), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("failed to connect database: %w", err)
	}

	// 自动迁移创建表
	db.AutoMigrate(&Task{})
	db.AutoMigrate(&TaskConfig{})
	db.AutoMigrate(&TaskOutput{})
	return nil
}

// CreateInput 创建任务并保存到数据库
func CreateTask(taskType string, input string, runEndpoint string) (uint, error) {
	// 生成当前时间
	now := time.Now()

	// 如果前端没有提供runEndpoint，尝试从TaskConfig中获取
	if runEndpoint == "" {
		var taskConfig TaskConfig
		if err := db.Where("task_type = ?", taskType).First(&taskConfig).Error; err == nil {
			if runEndpoint == "" {
				runEndpoint = taskConfig.RunEndpoint
			}
		}
	}

	// 创建Task实例，ID由SQLite自动生成
	task := Task{
		TaskType:    taskType,
		Input:       input,
		CreateTime:  now,
		RunEndpoint: runEndpoint,
		Status:      "ready",
	}

	// 保存到数据库
	if result := db.Create(&task); result.Error != nil {
		return 0, result.Error
	}

	// 将uint类型的ID转换为string返回
	return task.ID, nil
}

// GetTask 根据ID从数据库获取任务
func GetTask(taskID uint) *Task {
	var task Task
	result := db.Where("id = ?", taskID).First(&task)
	if result.Error != nil {
		return nil
	}
	return &task
}

// ListTasks 查询任务列表，支持分页和任务类型过滤
func ListTasks(taskType string, page int, pageSize int) ([]*Task, int64, error) {
	var tasks []*Task
	var total int64

	// 构建查询
	query := db.Model(&Task{})

	// 如果提供了任务类型，则添加过滤条件
	if taskType != "" {
		query = query.Where("task_type = ?", taskType)
	}

	// 获取总记录数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 计算偏移量
	offset := (page - 1) * pageSize

	// 执行分页查询，按创建时间倒序排列
	if err := query.Offset(offset).Limit(pageSize).Order("create_time DESC").Find(&tasks).Error; err != nil {
		return nil, 0, err
	}

	return tasks, total, nil
}

// DeleteTask 根据ID删除任务及关联的任务输出
func DeleteTask(taskID uint) error {
	// 先删除关联的任务输出
	if err := db.Where("task_id = ?", taskID).Delete(&TaskOutput{}).Error; err != nil {
		return err
	}
	// 再删除任务
	result := db.Delete(&Task{}, taskID)
	return result.Error
}

func CallbackTask(taskID uint, status string, result string, message string) error {
	updateData := map[string]interface{}{
		"status":  status,
		"result":  result,
		"message": message,
	}
	return db.Table("task").Where("id = ?", taskID).Updates(updateData).Error
}

func UpdateTaskConfig(taskType string, taskConfig *TaskConfig) error {
	updateData := map[string]interface{}{
		"title":        taskConfig.Title,
		"form":         taskConfig.Form,
		"run_endpoint": taskConfig.RunEndpoint,
	}
	fmt.Printf("updateData: %v\n", updateData)
	result := db.Table("task_config").Where("task_type = ?", taskType).Updates(updateData)
	return result.Error
}

func CreateTaskConfig(taskConfig *TaskConfig) error {
	result := db.Create(taskConfig)
	return result.Error
}

func GetTaskConfig(taskType string) *TaskConfig {
	var taskConfig TaskConfig
	result := db.Where("task_type = ?", taskType).First(&taskConfig)
	if result.Error != nil {
		return nil
	}
	return &taskConfig
}

func GetTaskConfigList() ([]*TaskConfig, error) {
	var taskConfigs []*TaskConfig
	result := db.Find(&taskConfigs)
	if result.Error != nil {
		return nil, result.Error
	}
	return taskConfigs, nil
}

func DeleteTaskConfig(taskType string) error {
	result := db.Where("task_type = ?", taskType).Delete(&TaskConfig{})
	return result.Error
}

func CreateTaskOutput(taskID uint, output string) error {
	result := db.Create(&TaskOutput{
		TaskID:     taskID,
		Output:     output,
		CreateTime: time.Now(),
	})
	return result.Error
}

func GetTaskOutput(taskID uint, lastID int, pageSize int) ([]TaskOutput, error) {
	var taskOutputs []TaskOutput
	result := db.Where("task_id = ? AND id > ?", taskID, lastID).Order("id asc").Limit(pageSize).Find(&taskOutputs)
	if result.Error != nil {
		return nil, result.Error
	}
	return taskOutputs, nil
}
