import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, Typography, Alert, Card, Row, Col } from 'antd';
import { LockOutlined, UserOutlined, CloseOutlined, UndoOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { IS_LOGIN_WINDOW } from '../../utils/windowIdentity';
import fibeLogo from '../../assets/fibe-logo.png';

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

  // Redirect if already authenticated.
  //
  // Skipped in the logon dialog: there, the main process opens the dashboard in
  // its own window and closes this one. Navigating would briefly paint the full
  // dashboard inside the 520px dialog first.
  useEffect(() => {
    if (isAuthenticated && !isLoading && !IS_LOGIN_WINDOW) {
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
    // In the logon dialog, Cancel means "don't sign in" — there is no app
    // behind it yet, so quit outright, as the legacy software does.
    if (IS_LOGIN_WINDOW) {
      (window as any).electronAPI?.quitApp?.();
      return;
    }

    // Elsewhere just close the window.
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.closeWindow) {
      electronAPI.closeWindow();
    } else {
      window.close();
    }
  };

  // In the logon dialog the WINDOW is the card: the form sits flush against the
  // frame instead of floating inside a page background, which is what made it
  // look like "a window inside a card".
  // The dialog's own title bar already names the app, so the body only needs
  // the mark and a one-line prompt.
  const heading = IS_LOGIN_WINDOW ? (
    <div style={{ textAlign: 'center', marginBottom: 26 }}>
      {/* Tailwind's preflight sets `img { display: block }`, so textAlign on the
          parent does not centre this — the auto side margins do. */}
      <img
        src={fibeLogo}
        alt=""
        style={{ height: 46, objectFit: 'contain', margin: '0 auto 10px' }}
      />
      <div style={{ fontSize: 13, color: 'rgba(0,0,0,.45)' }}>
        Sign in to continue
      </div>
    </div>
  ) : (
    <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>Login</Title>
  );

  const body = (
    <>
      {heading}

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
    </>
  );

  if (IS_LOGIN_WINDOW) {
    return <div style={{ padding: '26px 30px 30px' }}>{body}</div>;
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <Card hoverable>{body}</Card>
    </div>
  );
};

export default LoginForm;
