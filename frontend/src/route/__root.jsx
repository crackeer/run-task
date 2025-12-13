import { createRootRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { Layout, Menu } from 'antd'
import 'antd/dist/reset.css'
import { HomeOutlined, SettingOutlined, TableOutlined, DatabaseOutlined } from '@ant-design/icons'

const RootLayout = () => {
  const { Header, Content } = Layout
  const location = useLocation()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ padding: 0, background: '#fff', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            style={{ borderBottom: 0 }}
            items={[
              {
                key: '/',
                icon: <HomeOutlined />,
                label: <Link to="/">执行任务</Link>,
              },
              {
                key: '/tasks',
                icon: <TableOutlined />,
                label: <Link to="/tasks">执行记录</Link>,
              },
              {
                key: '/config',
                icon: <DatabaseOutlined />,
                label: <Link to="/config">任务配置</Link>,
              }
            ]}
          />
      </Header>
      <Content style={{ margin: '16px' }}>
        <Outlet />
      </Content>
    </Layout>
  )
}

export const Route = createRootRoute({ component: RootLayout })