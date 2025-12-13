import { createFileRoute } from '@tanstack/react-router'
import { Card, Typography, Form, Input, Button } from 'antd'
import { useState } from 'react'

const { Title, Text } = Typography

const Settings = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const onFinish = (values) => {
    setLoading(true)
    // 模拟保存设置
    setTimeout(() => {
      console.log('Settings saved:', values)
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title={<Title level={3}>设置</Title>} bordered={false} style={{ marginBottom: '24px' }}>
        <Text type="secondary">管理应用程序设置</Text>
      </Card>

      <Card bordered={false}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            apiEndpoint: 'http://localhost:8080',
            refreshInterval: 5000,
          }}
          onFinish={onFinish}
        >
          <Form.Item
            name="apiEndpoint"
            label="API 端点"
            rules={[{ required: true, message: '请输入API端点' }]}
          >
            <Input placeholder="http://localhost:8080" />
          </Form.Item>

          <Form.Item
            name="refreshInterval"
            label="刷新间隔 (毫秒)"
            rules={[{ required: true, message: '请输入刷新间隔' }]}
          >
            <Input type="number" placeholder="5000" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/settings')({
  component: Settings,
})