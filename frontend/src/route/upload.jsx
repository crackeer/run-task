import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, Button, Upload, message, Typography, Input, Progress } from 'antd'
import { UploadOutlined, CopyOutlined } from '@ant-design/icons'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import axios from 'axios'

const { Title } = Typography
const { TextArea } = Input
export const Route = createFileRoute('/upload')({
    component: UploadPage,
})

function UploadPage() {
    const [messageApi, contextHolder] = message.useMessage()
    const [downloadUrl, setDownloadUrl] = useState('')
    const [fileList, setFileList] = useState([])

    // 自定义上传函数，实现进度监听
    const customRequest = async ({ file, onSuccess, onError, onProgress }) => {
        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await axios.post('/api/upload', formData, {
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



    return (
        <div>
            {contextHolder}
            <Card style={{ marginBottom: 24 }}>
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
                    <div style={{ marginBottom: 16 }}>
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
        </div>
    )
}