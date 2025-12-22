import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, Button, Upload, message, Typography, Input, Progress, Table, Space, Spin, Modal } from 'antd'
import { UploadOutlined, CopyOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import axios from 'axios'

const { Title } = Typography
const { TextArea } = Input
export const Route = createFileRoute('/upload')({
    component: UploadPage,
})

function UploadPage() {
    const [messageApi, contextHolder] = message.useMessage()
    const [modalApi, modalContextHolder] = Modal.useModal()
    const [downloadUrl, setDownloadUrl] = useState('')
    const [fileList, setFileList] = useState([])
    const [serverFiles, setServerFiles] = useState([])
    const [loading, setLoading] = useState(false)

    // 获取服务器文件列表
    const fetchFiles = async () => {
        setLoading(true)
        try {
            const response = await axios.get('/api/file/list')
            if (response.data.code === 0) {
                // 过滤出非目录文件
                const files = response.data.files.filter(file => !file.is_dir)
                setServerFiles(files)
            } else {
                messageApi.error(response.data.message || '获取文件列表失败')
            }
        } catch (error) {
            messageApi.error('获取文件列表失败')
            console.error('Failed to fetch files:', error)
        } finally {
            setLoading(false)
        }
    }

    // 下载文件
    const downloadFile = (file) => {
        try {
            window.open(file.download_url, '_blank')
            messageApi.success('文件下载已开始')
        } catch (error) {
            messageApi.error('文件下载失败')
            console.error('Failed to download file:', error)
        }
    }

    // 删除文件
    const deleteFile = async (file) => {
        try {
            // 显示确认对话框
            modalApi.confirm({
                title: '确认删除',
                content: `您确定要删除文件 "${file.name}" 吗？`,
                okText: '删除',
                okType: 'danger',
                cancelText: '取消',
                async onOk() {
                    // 调用删除文件的API
                    const response = await axios.post('/api/file/delete', null, {
                        params: {
                            relative_path: file.relative_path
                        }
                    })
                    
                    if (response.data.code === 0) {
                        messageApi.success('文件删除成功')
                        // 删除成功后刷新文件列表
                        fetchFiles()
                    } else {
                        messageApi.error(response.data.message || '文件删除失败')
                    }
                }
            })
        } catch (error) {
            messageApi.error('文件删除失败')
            console.error('Failed to delete file:', error)
        }
    }

    // 自定义上传函数，实现进度监听
    const customRequest = async ({ file, onSuccess, onError, onProgress }) => {
        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await axios.post('/api/file/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        onProgress({ percent })
                    }
                },
            })

            onSuccess(response.data, file)
            // 上传成功后刷新文件列表
            fetchFiles()
        } catch (error) {
            onError(error)
        }
    }

    const handleChange = (info) => {
        setFileList(info.fileList)

        if (info.file.status === 'done') {
            // 上传成功，获取下载链接
            const response = info.file.response
            if (response && response.url) {
                setDownloadUrl(response.url)
                messageApi.success(`${info.file.name} 上传成功`)
            }
        } else if (info.file.status === 'error') {
            messageApi.error(`${info.file.name} 上传失败`)
        }
    }

    // 页面加载时获取文件列表
    useEffect(() => {
        fetchFiles()
    }, [])

    // 表格列配置
    const columns = [
        {
            title: '文件名',
            dataIndex: 'name',
            key: 'name',
            ellipsis: true,
        },
        {
            title: '大小',
            dataIndex: 'size',
            key: 'size',
            render: (size) => {
                if (size < 1024) {
                    return `${size} B`
                } else if (size < 1024 * 1024) {
                    return `${(size / 1024).toFixed(2)} KB`
                } else {
                    return `${(size / (1024 * 1024)).toFixed(2)} MB`
                }
            },
        },
        {
            title: '修改时间',
            dataIndex: 'mod_time',
            key: 'mod_time',
            render: (modTime) => {
                const date = new Date(modTime)
                return date.toLocaleString()
            },
        },
        {
            title: '路径',
            dataIndex: 'relative_path',
            key: 'relative_path',
            ellipsis: true,
            render: (path) => <code>{path}</code>,
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => {
                return (
                    <Space size="middle">
                        <Button
                            icon={<DownloadOutlined />}
                            size="small"
                            onClick={() => downloadFile(record)}
                        >
                            下载
                        </Button>
                        <CopyToClipboard text={record.download_url} onCopy={() => messageApi.success('下载链接已复制')}>
                            <Button
                                icon={<CopyOutlined />}
                                size="small"
                            >
                                复制链接
                            </Button>
                        </CopyToClipboard>
                        <Button
                            icon={<DeleteOutlined />}
                            size="small"
                            danger
                            onClick={() => deleteFile(record)}
                        >
                            删除
                        </Button>
                    </Space>
                )
            },
        },
    ]

    return (
        <div>
            {contextHolder}
            <Card style={{ marginBottom: 15 }}>
                <Upload
                    customRequest={customRequest}
                    fileList={fileList}
                    onChange={handleChange}
                    showUploadList={{
                        showRemoveIcon: true,
                        // 自定义上传列表项，显示进度条
                        itemRender: (originNode, file) => {
                            return (
                                <div>
                                    {originNode}
                                    {file.status === 'uploading' && (
                                        <div style={{ marginTop: 8 }}>
                                            <Progress percent={file.percent} size="small" status="active" />
                                        </div>
                                    )}
                                </div>
                            )
                        },
                    }}
                    accept="*"
                >
                    <Button icon={<UploadOutlined />} type="primary">
                        选择文件上传
                    </Button>
                </Upload>
            </Card>

            {downloadUrl && (
                <Card title="下载链接">
                    <div>
                        <TextArea
                            value={downloadUrl}
                            readOnly
                            rows={4}
                            style={{ marginBottom: 8 }}
                        />
                        <CopyToClipboard text={downloadUrl} onCopy={() => messageApi.success('链接已复制')}>
                            <Button
                                icon={<CopyOutlined />}
                            >
                                复制链接
                            </Button>
                        </CopyToClipboard>
                    </div>
                </Card>
            )}

            <Card
                style={{ marginTop: 15 }}
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>文件列表</span>
                        <Button
                            onClick={fetchFiles}
                            loading={loading}
                        >
                            刷新
                        </Button>
                    </div>
                }
            >
                <Spin spinning={loading}>
                    <Table
                        columns={columns}
                        dataSource={serverFiles}
                        rowKey="path"
                        bordered
                        size="middle"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '20', '50', '100'],
                        }}
                        scroll={{ x: 800 }}
                    />
                </Spin>
            </Card>
            {modalContextHolder}
        </div>
    )
}