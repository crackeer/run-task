import { useState, useEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Typography, Button, Card, Space, message, Radio } from 'antd'
import 'antd/dist/reset.css'
import FormRender, { useForm } from 'form-render'
import TaskOutput from '../component/output'

export const Route = createFileRoute('/')({
    component: Index,
})

function Index() {
    const [currentTaskId, setCurrentTaskId] = useState(null)
    const form = useForm()
    const [tools, setTools] = useState([])
    const [selectedTool, setSelectedTool] = useState('')
    const [selectedToolInfo, setSelectedToolInfo] = useState(null)
    const location = window.location
    const [messageApi, contextHolder] = message.useMessage()
   

    // 获取工具列表
    useEffect(() => {
        fetch('/api/task/config/list')
            .then(response => response.json())
            .then(data => {
                // 将TaskConfig转换为页面需要的格式
                const formattedTools = data.map(config => ({
                    name: config.task_type,
                    title: config.title,
                    form: JSON.parse(config.form),
                    run_endpoint: config.run_endpoint,
                }))
                setTools(formattedTools)
                if (formattedTools.length > 0) {
                    // 尝试从localStorage读取最后选择的任务类型
                    const lastSelectedTool = localStorage.getItem('lastSelectedTool')
                    // 如果有存储的任务类型且在工具列表中存在，则使用它；否则使用第一个工具
                    const defaultTool = lastSelectedTool && formattedTools.some(tool => tool.name === lastSelectedTool)
                        ? lastSelectedTool
                        : formattedTools[formattedTools.length - 1].name // 使用最后一个工具作为默认值

                    setSelectedTool(defaultTool)
                    const selectedToolConfig = formattedTools.find(tool => tool.name === defaultTool)
                    if (selectedToolConfig) {
                        setSelectedToolInfo(selectedToolConfig)
                    }
                }
            })
            .catch(error => {
                console.error('Failed to fetch tools:', error)
                message.error('获取工具列表失败')
            })
    }, [])

    // 处理重跑任务参数
    useEffect(() => {
        // 使用URLSearchParams解析查询参数
        const params = new URLSearchParams(location.search)
        const rerunTaskId = params.get('rerun_task_id')
        if (rerunTaskId) {
            // 获取任务详情
            fetch(`/api/task/detail?task_id=${rerunTaskId}`)
                .then(response => response.json())
                .then(task => {
                    if (task) {
                        // 设置选中的工具类型
                        setSelectedTool(task.task_type)
                        // 查找对应的工具配置
                        const tool = tools.find(t => t.name === task.task_type)
                        if (tool) {
                            setSelectedToolInfo(tool)
                        }
                        // 解析并设置表单数据
                        try {
                            const parsedInput = JSON.parse(task.input)
                            console.log(parsedInput, task.input, form)

                            Object.keys(parsedInput).forEach(key => {
                                form.setFieldValue(key, parsedInput[key])
                            })
                        } catch (error) {
                            console.error('解析任务输入参数失败:', error)
                            message.error('解析任务参数失败')
                        }
                    }
                })
                .catch(error => {
                    console.error('获取任务详情失败:', error)
                    message.error('获取任务详情失败')
                })
        }
    }, [location.search, tools])

    // 处理工具选择变化
    const handleToolChange = (e) => {
        const value = e.target.value;
        const tool = tools.find(t => t.name === value)
        setSelectedTool(value)
        setSelectedToolInfo(tool)
        // 将选择的工具保存到localStorage
        localStorage.setItem('lastSelectedTool', value)
    }



    const runTask = () => {
        if (!selectedTool) {
            message.error('请选择一个工具')
            return
        }

        form.validateFields().then((formData) => {
            // 调用task接口创建任务
            fetch('/api/task/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    task_type: selectedTool,
                    input: JSON.stringify(formData),
                    run_endpoint: selectedToolInfo?.run_endpoint || '',
                })
            })
                .then(response => response.json())
                .then(data => {
                    
                    const taskID = data.task_id
                    console.log('任务已创建，task_id:', taskID, data)
                    setCurrentTaskId(taskID)
                })
                .catch(error => {
                   
                    console.error('创建任务失败:', error)
                    messageApi.error('创建任务失败，请重试')
                })
        }).catch(() => {
            // 表单验证失败，提示用户
            message.error('请填写完整的表单')
        })
    }



    const { Text } = Typography

    return (
        <div>
            <Card title={<Radio.Group
                value={selectedTool}
                onChange={handleToolChange}
                style={{ marginLeft: '3px', display: 'flex', flexWrap: 'wrap' }}
            >
                {tools.map(tool => (
                    <Radio key={tool.name} value={tool.name}>
                        {tool.title}
                    </Radio>
                ))}
            </Radio.Group>} style={{ marginBottom: '24px' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {selectedToolInfo && (
                        <div>
                            <FormRender
                                schema={selectedToolInfo.form}
                                form={form}
                                onFinish={() => {
                                    form.validate().then((values) => {
                                        console.log(values)
                                    })
                                }}
                                footer={false}
                            />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div>
                                    <Typography.Text style={{ marginRight: '8px' }} strong>运行端点:</Typography.Text>
                                    <Typography.Text code>{selectedToolInfo.run_endpoint || '-'}</Typography.Text>
                                </div>
                            </div>
                        </div>
                    )}

                    <Space>
                        <Button
                            type="primary"
                            onClick={runTask}
                            disabled={!!currentTaskId}
                        >
                            执行
                        </Button>
                        {currentTaskId && (
                            <Button
                                onClick={() => setCurrentTaskId(null)}
                            >
                                清除输出
                            </Button>
                        )}
                    </Space>
                </Space>
            </Card>

            {currentTaskId && (
                <TaskOutput
                    task_id={currentTaskId}
                    title="任务输出"
                    autoStart={true}
                />
            )}
            {contextHolder}
        </div>
    )
}
