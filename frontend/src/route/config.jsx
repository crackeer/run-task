import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Table, Form, Input, Button, Modal, message, Card, Space } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'

const { TextArea } = Input

const TaskConfigPage = () => {
  const [taskConfigs, setTaskConfigs] = useState([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [modalVisible, setModalVisible] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentConfig, setCurrentConfig] = useState(null)
  const [modal, modalContext] = Modal.useModal()

  // 获取任务配置列表
  const fetchTaskConfigs = () => {
    setLoading(true)
    fetch('/api/task/config/list')
      .then(response => response.json())
      .then(data => {
        setTaskConfigs(data)
        setLoading(false)
      })
      .catch(error => {
        message.error('获取任务配置列表失败')
        setLoading(false)
      })
  }

  // 组件加载时获取数据
  useEffect(() => {
    fetchTaskConfigs()
  }, [])

  // 打开新增模态框
  const handleAdd = () => {
    setIsEditing(false)
    setCurrentConfig(null)
    form.resetFields()
    setModalVisible(true)
  }

  // 打开编辑模态框
  const handleEdit = (record) => {
    setIsEditing(true)
    setCurrentConfig(record)
    form.setFieldsValue({
      task_type: record.task_type,
      title: record.title,
      form: record.form,
      run_endpoint: record.run_endpoint
    })
    setModalVisible(true)
  }

  // 删除任务配置
  const handleDelete = (record) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除任务配置: ${record.task_type}吗？`,
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        fetch('/api/task/config/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ task_type: record.task_type })
        })
          .then(response => response.json())
          .then(data => {
            message.success('删除成功')
            fetchTaskConfigs()
          })
          .catch(error => {
            message.error('删除失败')
          })
      }
    })
  }

  // 保存任务配置（新增或编辑）
  const handleSave = () => {
    form.validateFields().then(values => {
      const url = isEditing ? '/api/task/config/update' : '/api/task/config/create'
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      })
        .then(response => response.json())
        .then(data => {
          message.success(isEditing ? '更新成功' : '创建成功')
          setModalVisible(false)
          fetchTaskConfigs()
        })
        .catch(error => {
          message.error(isEditing ? '更新失败' : '创建失败')
        })
    }).catch(errorInfo => {
      console.log('表单验证失败:', errorInfo)
    })
  }

  // 表格列定义
  const columns = [
    {
      title: '任务类型',
      dataIndex: 'task_type',
      key: 'task_type',
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '表单配置',
      dataIndex: 'form',
      key: 'form',
      ellipsis: true,
      render: (text) => (
        <span title={text}>{text.substring(0, 50)}...</span>
      )
    },
    {
      title: '运行端点',
      dataIndex: 'run_endpoint',
      key: 'run_endpoint',
      width: 200
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '16px' }}>
        {modalContext}
      <Card title="任务配置管理" bordered={false} extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增
        </Button>
      }>
        <Table
          columns={columns}
          dataSource={taskConfigs}
          rowKey="task_type"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 新增/编辑模态框 */}
      <Modal
        title={isEditing ? '编辑任务配置' : '新增任务配置'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setModalVisible(false)} icon={<CloseOutlined />}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleSave} icon={<SaveOutlined />}>
            保存
          </Button>
        ]}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            form: '{}',
            run: '',
            input: ''
          }}
        >
          <Form.Item
            name="task_type"
            label="任务类型"
            rules={[{ required: true, message: '请输入任务类型' }]}
          >
            <Input placeholder="请输入任务类型" disabled={isEditing} />
          </Form.Item>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入标题" />
          </Form.Item>
          <Form.Item
            name="form"
            label="表单配置 (JSON)"
            rules={[{ required: true, message: '请输入表单配置' }]}
          >
            <TextArea placeholder="请输入表单配置 JSON" rows={6} />
          </Form.Item>
          <Form.Item
            name="run_endpoint"
            label="运行端点"
          >
            <Input placeholder="请输入运行端点" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export const Route = createFileRoute('/config')({
  component: TaskConfigPage,
})