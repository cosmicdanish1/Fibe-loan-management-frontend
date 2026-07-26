import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, Typography, Alert, Card, Row, Col } from 'antd';
import { LockOutlined, UserOutlined, CloseOutlined, UndoOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;

const LoginForm: React.FC = () => {
  console.log('[LoginForm] Rendering LoginForm component');
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  console.log('[LoginForm] Auth state:', { isAuthenticated, isLoading, error });

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const onFinish = async (values: { username: string; password: string }) => {
    console.log('[LoginForm] Form submitted with values:', { username: values.username });
    try {
      setIsSubmitting(true);
      console.log('[LoginForm] Calling login function...');
      await login(values);
      console.log('[LoginForm] Login successful, should be redirected soon');
    } catch (err) {
      console.error('[LoginForm] Login failed:', err);
    } finally {
      console.log('[LoginForm] Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    form.resetFields();
    clearError();
  };

  const handleCancel = () => {
    // Close the window in Electron environment, or navigate away in browser
    if (window.electron) {
      window.electron.ipcRenderer.send('close-window');
    } else {
      window.close();
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <Card hoverable>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>Login</Title>
        
        {error && (
          <Alert
            message="Login Failed"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: '24px' }}
            closable
            onClose={clearError}
          />
        )}

        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ 
              required: true, 
              message: 'Please input your username!' 
            }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="Enter your username"
              size="large"
              disabled={isSubmitting}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ 
              required: true, 
              message: 'Please input your password!' 
            }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="Enter your password"
              size="large"
              disabled={isSubmitting}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: '16px' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmitting || isLoading}
              block
              size="large"
              style={{ marginBottom: '12px' }}
            >
              Sign In
            </Button>
            
            <Row gutter={16}>
              <Col span={12}>
                <Button
                  htmlType="button"
                  onClick={handleClear}
                  block
                  size="large"
                  icon={<UndoOutlined />}
                  disabled={isSubmitting}
                >
                  Clear
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  htmlType="button"
                  onClick={handleCancel}
                  block
                  size="large"
                  danger
                  icon={<CloseOutlined />}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </Col>
            </Row>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginForm;
