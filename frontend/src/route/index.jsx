import { useState, useEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { ImageAddon } from 'xterm-addon-image';
import '@xterm/xterm/css/xterm.css'
import { Typography, Button, Card, Space, message, Radio } from 'antd'
import 'antd/dist/reset.css'
import FormRender, { useForm } from 'form-render'

export const Route = createFileRoute('/')({
    component: Index,
})

function Index() {
    const [isConnected, setIsConnected] = useState(false)
    const eventSourceRef = useRef(null)
    const terminalRef = useRef(null)
    const terminalInstanceRef = useRef(null)
    const fitAddonRef = useRef(null)
    const form = useForm()
    const [tools, setTools] = useState([])
    const [selectedTool, setSelectedTool] = useState('')
    const [selectedToolInfo, setSelectedToolInfo] = useState(null)
    const location = window.location
    
    // 轮询控制状态
    const pollingControlRef = useRef({
        isRunning: false,
        taskID: null,
        timeoutId: null
    })

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
                    input_endpoint: config.input_endpoint
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

    // 轮询获取任务输出
    const pollTaskOutput = (taskID, lastOutputID = 0) => {
        return fetch(`/api/task/output/${taskID}?last_id=${lastOutputID}&page_size=200`)
            .then(response => response.json())
            .then(outputs => {
                if (outputs && outputs.length > 0) {
                    // 更新终端显示
                    outputs.forEach(output => {
                        if (terminalInstanceRef.current) {
                            let msg = output.output.replace(/{WINDOW_HOSTNAME}/g, window.location.host)
                            terminalInstanceRef.current.writeln(msg)
                        }
                    })
                    // 返回最新的output ID
                    return outputs[outputs.length - 1].id
                }
                return lastOutputID
            })
            .catch(error => {
                console.error('获取任务输出失败:', error)
                if (terminalInstanceRef.current) {
                    terminalInstanceRef.current.writeln(`\x1b[31m获取任务输出失败: ${error.message}\x1b[0m`)
                }
                return lastOutputID
            })
    }

    // 检查任务状态
    const checkTaskStatus = (taskID) => {
        return fetch(`/api/task/detail?task_id=${taskID}`)
            .then(response => response.json())
            .then(task => {
                if (task) {
                    return task
                }
                return {
                    status: 'unknown',
                    message: '任务不存在',
                }
            })
            .catch(error => {
                console.error('获取任务状态失败:', error)
                return {
                    status: 'error',
                    message: '获取任务状态失败',
                }
            })
    }

    // 运行任务并轮询获取输出
    const pollingTaskOutput = (taskID) => {
        if (!selectedTool) {
            message.error('请选择一个工具')
            return
        }

        // 初始化终端
        if (terminalRef.current && !terminalInstanceRef.current) {
            const terminal = new Terminal({
                theme: {
                    background: '#1e1e1e',
                    foreground: '#d4d4d4'
                },
                fontSize: 14,
                fontFamily: 'Consolas, "Courier New", monospace',
                cursorBlink: false
            })
            const fitAddon = new FitAddon()
            const webLinksAddon = new WebLinksAddon()
            const imageAddon = new ImageAddon();
            terminal.loadAddon(fitAddon)
            terminal.loadAddon(webLinksAddon)
            terminal.loadAddon(imageAddon)
            terminal.open(terminalRef.current)
            fitAddon.fit()

            terminalInstanceRef.current = terminal
            fitAddonRef.current = fitAddon
        }

        // 清除终端内容
        if (terminalInstanceRef.current) {
            terminalInstanceRef.current.clear()
            terminalInstanceRef.current.writeln(`任务 ${taskID} 正在运行...，以下为任务输出--->\n`)
        }

        // 初始化轮询控制状态
        pollingControlRef.current = {
            isRunning: true,
            taskID: taskID,
            timeoutId: null
        }

        // 开始轮询
        let lastOutputID = 0
        const pollInterval = 1000 // 1秒轮询一次

        const startPolling = () => {
            if (!pollingControlRef.current.isRunning) return

            // 先获取任务输出
            pollTaskOutput(taskID, lastOutputID)
                .then(newLastOutputID => {
                    lastOutputID = newLastOutputID
                    // 然后检查任务状态
                    return checkTaskStatus(taskID)
                })
                .then(task => {
                    if (task.status === 'running') {
                        // 任务仍在运行，继续轮询
                        pollingControlRef.current.timeoutId = setTimeout(startPolling, pollInterval)
                        return
                    }
                    pollingControlRef.current.isRunning = false
                    if (terminalInstanceRef.current) {
                         terminalInstanceRef.current.writeln(`\n<----以上为任务输出，以下为任务状态`)
                        terminalInstanceRef.current.writeln(`任务状态: ${task.status}`)
                        if (task.status === 'success') {
                            terminalInstanceRef.current.writeln('\x1b[32m任务执行成功\x1b[0m：' + task.result)
                        } else {
                            terminalInstanceRef.current.writeln(`\x1b[31m任务执行${task.status === 'failed' ? '失败' : '出错'}\x1b[0m：${task.message}`)
                        }
                    }
                    setIsConnected(false)
                })
                .catch(error => {
                    console.error('轮询出错:', error)
                    pollingControlRef.current.isRunning = false
                    setIsConnected(false)
                })
        }

        // 开始轮询
        setIsConnected(true)
        startPolling()
    }

    // 停止轮询函数
    const stopPolling = () => {
        if (pollingControlRef.current.isRunning) {
            // 清除定时器
            clearTimeout(pollingControlRef.current.timeoutId)
            // 更新轮询控制状态
            pollingControlRef.current.isRunning = false
            // 更新连接状态
            setIsConnected(false)
            // 在终端中显示轮询已停止的消息
            if (terminalInstanceRef.current) {
                terminalInstanceRef.current.writeln('\n\x1b[33m轮询已手动停止\x1b[0m')
            }
        }
    }

    // 保留原有的startSSE函数，用于向后兼容
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
          console.log('任务已创建，task_id:', taskID)
          pollingTaskOutput(taskID)
        })
        .catch(error => {
          console.error('创建任务失败:', error)
          message.error('创建任务失败，请重试')
        })
    }).catch(() => {
      // 表单验证失败，提示用户
      message.error('请填写完整的表单')
    })
  }

    // 处理窗口大小变化
    useEffect(() => {
        const handleResize = () => {
            if (terminalInstanceRef.current && fitAddonRef.current) {
                fitAddonRef.current.fit()
            }
        }

        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    // 组件卸载时清理资源
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close()
            }
            if (terminalInstanceRef.current) {
                terminalInstanceRef.current.dispose()
            }
        }
    }, [])

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
                            {/* 显示当前选中任务的run_endpoint和input_endpoint */}
                            <div style={{ backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                <Typography.Text strong>任务端点配置:</Typography.Text>
                                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div>
                                        <Typography.Text style={{ marginRight: '8px' }}>运行端点:</Typography.Text>
                                        <Typography.Text code>{selectedToolInfo.run_endpoint || '-'}</Typography.Text>
                                    </div>
                                    <div>
                                        <Typography.Text style={{ marginRight: '8px' }}>输入端点:</Typography.Text>
                                        <Typography.Text code>{selectedToolInfo.input_endpoint || '-'}</Typography.Text>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <Space>
                        <Button
                            type="primary"
                            onClick={runTask}
                            disabled={isConnected}
                            loading={isConnected}
                        >
                            执行
                        </Button>
                        <Button
                            danger
                            onClick={stopPolling}
                            disabled={!isConnected}
                        >
                            停止轮询
                        </Button>
                    </Space>
                </Space>
            </Card>

            <Card title={<Text strong>任务输出</Text>} bordered={false}>
                <div
                    ref={terminalRef}
                    style={{ width: '100%', height: '600px', borderRadius: '1px' }}
                ></div>
            </Card>
        </div>
    )
}
