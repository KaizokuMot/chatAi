import React, { useState } from 'react';
import { Form, Input, Button, Typography, message, Modal } from 'antd';
import { UserOutlined, LockOutlined, RobotOutlined,LoginOutlined } from '@ant-design/icons';
import { auth } from '../firebase';
import "./loginModel.css"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';


const { Text } = Typography;

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ visible, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, values.email, values.password);
        message.success('Account created successfully!');
      } else {
        await signInWithEmailAndPassword(auth, values.email, values.password);
        message.success('Logged in successfully!');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={400}
      styles={{ body: { padding: '24px 12px' } }}
    >
        <div style={{ textAlign: 'left', marginBottom: 24 }}>
          <div className='login-title'>    
                <div style={{ background: '#ff8c42', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                       <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
                     </div>
                               <h1 className='app_name'>ChatAi</h1>

                     </div>
          <Text style={{textAlign:"left"}} type="secondary">{isSignUp ? 'Create a new account' : 'Sign in to continue chatting'}</Text>
        </div>
        
        <Form name="login_modal_form" onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Please input your email!' }, { type: 'email', message: 'Invalid email' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }, { min: 6, message: 'Password must be at least 6 characters' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }} loading={loading} icon={<LoginOutlined />}>
              {isSignUp ? 'Sign Up' : 'Log In'}
            </Button>
          </Form.Item>
{/*           
          <Form.Item style={{ marginBottom: 12 }}>
            <Button 
              type="default" 
              style={{ width: '100%' }} 
              onClick={() => {
                localStorage.setItem('devMode', 'true');
                onSuccess();
                onClose();
              }}
            >
              Test as Dev User (Bypass Login)
            </Button>
          </Form.Item> */}

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <a onClick={() => setIsSignUp(!isSignUp)} style={{ fontWeight: 500 }}>
                {isSignUp ? 'Log In' : 'Sign Up'}
              </a>
            </Text>
          </div>
        </Form>
    </Modal>
  );
};

export default LoginModal;
