import { useState, useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { ImageAddon } from 'xterm-addon-image'
import '@xterm/xterm/css/xterm.css'
import { Card, Button, Space, Typography } from 'antd'

const { Text } = Typography

/**
 * TaskOutput组件 - 用于显示任务输出的终端组件
 * @param {string} task_id - 任务ID
 * @param {number} pollInterval - 轮询间隔（毫秒），默认1000ms
 * @param {string} title - 卡片标题，默认"任务输出"
 * @param {string} height - 终端高度，默认"600px"
 */
function TaskOutput({ 
    task_id, 
    pollInterval = 1000, 
    height = "600px"
}) {
    const [isPolling, setIsPolling] = useState(false)
    const [taskStatus, setTaskStatus] = useState('unknown')
    const terminalRef = useRef(null)
    const terminalInstanceRef = useRef(null)
    const fitAddonRef = useRef(null)
    
    // 轮询控制状态
    const pollingControlRef = useRef({
        isRunning: false,
        taskID: null,
        timeoutId: null,
        lastOutputID: 0
    })

    // 初始化终端
    const initializeTerminal = () => {
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
            const imageAddon = new ImageAddon()
            
            terminal.loadAddon(fitAddon)
            terminal.loadAddon(webLinksAddon)
            terminal.loadAddon(imageAddon)
            terminal.open(terminalRef.current)
            fitAddon.fit()

            terminalInstanceRef.current = terminal
            fitAddonRef.current = fitAddon
        }
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

    // 开始轮询
    const startPolling = () => {
        if (!task_id) {
            console.error('task_id is required')
            return
        }

        // 初始化终端
        initializeTerminal()

        // 清除终端内容
        if (terminalInstanceRef.current) {
            terminalInstanceRef.current.clear()
            terminalInstanceRef.current.writeln(`任务 ${task_id} 正在运行...，以下为任务输出--->\n`)
        }

        // 初始化轮询控制状态
        pollingControlRef.current = {
            isRunning: true,
            taskID: task_id,
            timeoutId: null,
            lastOutputID: 0
        }

        setIsPolling(true)

        const poll = () => {
            if (!pollingControlRef.current.isRunning) return

            // 先获取任务输出
            pollTaskOutput(task_id, pollingControlRef.current.lastOutputID)
                .then(newLastOutputID => {
                    pollingControlRef.current.lastOutputID = newLastOutputID
                    // 然后检查任务状态
                    return checkTaskStatus(task_id)
                })
                .then(task => {
                    setTaskStatus(task.status)
                    
                    if (task.status === 'running' || task.status === 'ready') {
                        // 任务仍在运行，继续轮询
                        pollingControlRef.current.timeoutId = setTimeout(poll, pollInterval)
                        return
                    }
                    
                    // 任务已完成，停止轮询
                    pollingControlRef.current.isRunning = false
                    setIsPolling(false)
                    
                    if (terminalInstanceRef.current) {
                        terminalInstanceRef.current.writeln(`\n<----以上为任务输出，以下为任务状态`)
                        terminalInstanceRef.current.writeln(`任务状态: ${task.status}`)
                        if (task.status === 'success') {
                            terminalInstanceRef.current.writeln('\x1b[32m任务执行成功\x1b[0m：' + task.result)
                        } else {
                            terminalInstanceRef.current.writeln(`\x1b[31m任务执行${task.status === 'failed' ? '失败' : '出错'}\x1b[0m：${task.message}`)
                        }
                    }
                })
                .catch(error => {
                    console.error('轮询出错:', error)
                    pollingControlRef.current.isRunning = false
                    setIsPolling(false)
                    setTaskStatus('error')
                })
        }

        // 开始轮询
        poll()
    }

    // 停止轮询
    const stopPolling = () => {
        if (pollingControlRef.current.isRunning) {
            // 清除定时器
            clearTimeout(pollingControlRef.current.timeoutId)
            // 更新轮询控制状态
            pollingControlRef.current.isRunning = false
            // 更新状态
            setIsPolling(false)
            // 在终端中显示轮询已停止的消息
            if (terminalInstanceRef.current) {
                terminalInstanceRef.current.writeln('\n\x1b[33m轮询已手动停止\x1b[0m')
            }
        }
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

    // 自动开始轮询
    // useEffect(() => {
    //     if (autoStart && task_id) {
    //         startPolling()
    //     }
        
    //     // 组件卸载时清理资源
    //     return () => {
    //         if (pollingControlRef.current.isRunning) {
    //             clearTimeout(pollingControlRef.current.timeoutId)
    //         }
    //         if (terminalInstanceRef.current) {
    //             terminalInstanceRef.current.dispose()
    //             terminalInstanceRef.current = null
    //         }
    //     }
    // }, [task_id, autoStart])

    // task_id变化时重新开始轮询
    useEffect(() => {
        if (task_id && pollingControlRef.current.taskID !== task_id) {
            stopPolling()
            startPolling()
        }
    }, [task_id])

    return (
        <Card 
            title={
                <Space>
                    {task_id && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            任务ID: {task_id}
                        </Text>
                    )}
                    {taskStatus !== 'unknown' && (
                        <Text 
                            type={taskStatus === 'success' ? 'success' : taskStatus === 'running' ? 'warning' : 'danger'}
                            style={{ fontSize: '12px' }}
                        >
                            状态: {taskStatus}
                        </Text>
                    )}
                </Space>
            }
            // extra={
            //     <Space>
            //         <Button
            //             type="primary"
            //             size="small"
            //             onClick={startPolling}
            //             disabled={isPolling || !task_id}
            //             loading={isPolling}
            //         >
            //             开始轮询
            //         </Button>
            //         <Button
            //             danger
            //             size="small"
            //             onClick={stopPolling}
            //             disabled={!isPolling}
            //         >
            //             停止轮询
            //         </Button>
            //     </Space>
            // }
            bordered={false}
        >
            <div
                ref={terminalRef}
                style={{ 
                    width: '100%', 
                    height: height, 
                    borderRadius: '4px',
                    border: '1px solid #d9d9d9'
                }}
            />
        </Card>
    )
}

export default TaskOutput