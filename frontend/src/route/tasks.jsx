import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { Table, Select, Pagination, Card, Spin, message, Button, Modal, Tag } from 'antd'
import { LoadingOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons'
import TaskOutput from '../component/output'

// 输入参数查看器组件
const InputParamViewer = ({ text, modal }) => {
    try {
        const parsed = JSON.parse(text)
        const formatted = JSON.stringify(parsed, null, 2)
        const displayText = formatted.length > 20 ? formatted.substring(0, 20) + '....' : formatted

        return (
            <div>
                <span>{displayText}</span>
                {formatted.length > 20 && (
                    <Button
                        type="text"
                        size="small"
                        onClick={() => {
                            modal.info({
                                title: '输入参数详情',
                                content: <pre style={{ whiteSpace: 'pre-wrap' }}>{formatted}</pre>,
                                width: 600
                            })
                        }}
                    >
                        查看全部
                    </Button>
                )}
            </div>
        )
    } catch (e) {
        const displayText = text.length > 20 ? text.substring(0, 20) + '....' : text

        return (
            <div>
                <span>{displayText}</span>
                {text.length > 20 && (
                    <Button
                        type="text"
                        size="small"
                        onClick={() => {
                            modal.info({
                                title: '输入参数详情',
                                content: <pre style={{ whiteSpace: 'pre-wrap' }}>{text}</pre>,
                                width: 600
                            })
                        }}
                    >
                        查看全部
                    </Button>
                )}
            </div>
        )
    }
}

// 创建加载图标
const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />

const TasksPage = () => {
    const [tasks, setTasks] = useState([])
    const [tools, setTools] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedType, setSelectedType] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [total, setTotal] = useState(0)
    const [modal, contextHolder] = Modal.useModal()
    const navigate = useNavigate()

    // 获取工具列表
    useEffect(() => {
        fetch('/api/tools')
            .then(res => res.json())
            .then(data => setTools(data))
            .catch(err => message.error('获取工具列表失败'))
    }, [])

    // 获取任务列表
    useEffect(() => {
        fetchTasks()
    }, [selectedType, page, pageSize])

    // 获取任务列表数据
    const fetchTasks = () => {
        setLoading(true)
        let url = `/api/task/list?page=${page}&page_size=${pageSize}`
        if (selectedType) {
            url += `&task_type=${selectedType}`
        }
        fetch(url)
            .then(res => res.json())
            .then(data => {
                setTasks(data.tasks || [])
                setTotal(data.total || 0)
                setLoading(false)
            })
            .catch(err => {
                message.error('获取任务列表失败')
                setLoading(false)
            })
    }

    // 处理任务类型筛选
    const handleTaskTypeChange = (value) => {
        setSelectedType(value)
        setPage(1)
    }

    // 处理分页变化
    const handlePageChange = (currentPage, currentPageSize) => {
        setPage(currentPage)
        setPageSize(currentPageSize)
    }

    // 删除任务
    const handleDeleteTask = (taskId) => {
        modal.confirm({
            title: '确认删除',
            content: '确定要删除这个任务吗？',
            okText: '确定',
            okType: 'danger',
            cancelText: '取消',
            onOk: () => {
                fetch(`/api/task/delete?task_id=${taskId}`, {
                    method: 'POST'
                })
                    .then(res => {
                        if (res.ok) {
                            message.success('任务删除成功')
                            // 重新获取任务列表
                            fetchTasks()
                        } else {
                            message.error('任务删除失败')
                        }
                    })
                    .catch(err => {
                        console.error('删除任务失败:', err)
                        message.error('任务删除失败')
                    })
            }
        })
    }

    // 查看任务结果
    const handleViewResult = (task) => {
        modal.info({
            title: '任务执行结果',
            content: (
                <div>
                    {task.status === 'success' && task.result && (
                        <div style={{ marginBottom: '16px' }}>
                            <strong>结果：</strong>
                            <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>
                                {typeof task.result === 'string' ? task.result : JSON.stringify(task.result, null, 2)}
                            </pre>
                        </div>
                    )}
                    {task.status === 'failed' && task.message && (
                        <div style={{ marginBottom: '16px' }}>
                            <strong>错误信息：</strong>
                            <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px', color: '#ff4d4f' }}>
                                {task.message}
                            </pre>
                        </div>
                    )}
                    {!task.result && !task.message && (
                        <div style={{ color: '#8c8c8c' }}>暂无结果信息</div>
                    )}
                </div>
            ),
            width: 600
        })
    }

    // 重跑任务
    const handleRerunTask = (task) => {
        // 跳转到首页并传递重跑参数
        console.log(task)
        // 使用路径对象格式导航，更可靠
        navigate({
            to: '/',
            search: {
                rerun_task_id: task.id
            }
        })
    }

    // 查看任务output
    const handleViewOutput = (task) => {
        // 使用TaskOutput组件创建Modal
        modal.info({
            title: `任务Output - ${task.id}`,
            content: (
                <div style={{ height: '580px' }}>
                    <TaskOutput
                        task_id={task.id}
                        autoStart={true}
                        pollInterval={1000}
                        title=""
                        height="500px"
                    />
                </div>
            ),
            width: 900,
            okButtonProps: {
                style: { display: 'none' }
            },
            maskClosable: true
        })
    }

    // 表格列定义
    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: '任务类型',
            dataIndex: 'task_type',
            key: 'task_type',
            width: 120,
        },
        {
            title: '任务标题',
            dataIndex: 'task_type',
            key: 'title',
            width: 200,
            render: (taskType) => {
                const tool = tools.find(t => t.name === taskType)
                return tool ? tool.title : taskType
            },
        },
        {
            title: '输入参数',
            dataIndex: 'input',
            key: 'input',
            render: (text) => <InputParamViewer text={text} modal={modal} />,
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status) => {
                const statusColorMap = {
                    'success': 'green',
                    'failed': 'red',
                    'running': 'blue',
                    'pending': 'orange',
                    'error': 'purple',
                    'unknown': 'gray'
                }

                const statusTextMap = {
                    'success': '成功',
                    'failed': '失败',
                    'running': '运行中',
                    'pending': '待处理',
                    'error': '错误',
                    'unknown': '未知'
                }

                return (
                    <Tag color={statusColorMap[status] || 'gray'}>
                        {statusTextMap[status] || status}
                    </Tag>
                )
            },
        },
        {
            title: '创建时间',
            dataIndex: 'create_time',
            key: 'create_time',
            width: 180,
            render: (text) => new Date(text).toLocaleString(),
        },
        {
            title: '操作',
            key: 'action',
            width: 250,
            render: (_, record) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                        type="text"
                        icon={<ReloadOutlined />}
                        onClick={() => handleRerunTask(record)}
                    >
                        重跑
                    </Button>
                    <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewResult(record)}
                    >
                        查看结果
                    </Button>
                    <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewOutput(record)}
                    >
                        查看Output
                    </Button>
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteTask(record.id)}
                    >
                        删除
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <div style={{ padding: '16px' }}>
            <Card title="任务记录" bordered={false}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Select
                            placeholder="按任务类型筛选"
                            value={selectedType}
                            onChange={handleTaskTypeChange}
                            style={{ width: 200 }}
                        >
                            <Select.Option key="all" value="">
                                全部
                            </Select.Option>
                            {tools.map(tool => (
                                <Select.Option key={tool.name} value={tool.name}>
                                    {tool.title}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>
                </div>

                <Spin indicator={antIcon} spinning={loading}>
                    <Table
                        columns={columns}
                        dataSource={tasks.map(task => ({ ...task, key: task.id }))}
                        pagination={false}
                        bordered
                        scroll={{ x: 800 }}
                        size="middle"
                    />

                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                        <Pagination
                            current={page}
                            pageSize={pageSize}
                            total={total}
                            onChange={handlePageChange}
                            showSizeChanger
                            showTotal={(total) => `共 ${total} 条记录`}
                            pageSizeOptions={['10', '20', '50', '100']}
                        />
                    </div>
                </Spin>
            </Card>
            {contextHolder}
        </div>
    )
}

export const Route = createFileRoute('/tasks')({
    component: TasksPage,
})
