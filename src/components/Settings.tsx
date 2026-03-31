import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Typography, Divider, Select, message } from 'antd';
import { auth, db } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const { Text, Title } = Typography;
const { Option } = Select;

const countries = [
  { label: 'United States', value: 'US' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'Canada', value: 'CA' },
  { label: 'Australia', value: 'AU' },
  { label: 'India', value: 'IN' },
  { label: 'Germany', value: 'DE' },
  { label: 'France', value: 'FR' },
  { label: 'Japan', value: 'JP' },
  { label: 'China', value: 'CN' },
  { label: 'Brazil', value: 'BR' },
];

interface SettingsProps {
  visible: boolean;
  onClose: () => void;
  apiUrl: string;
  setApiUrl: (url: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ visible, onClose, apiUrl, setApiUrl }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isDevMode = localStorage.getItem('devMode') === 'true';

  useEffect(() => {
    if (visible && auth.currentUser) {
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            form.setFieldsValue({
              fullName: data.fullName || auth.currentUser?.displayName || '',
              phoneNumber: data.phoneNumber || '',
              country: data.country || undefined,
            });
          } else {
            form.setFieldsValue({
              fullName: auth.currentUser?.displayName || '',
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };
      fetchUserData();
    }
  }, [visible, auth.currentUser, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 1. Update Ollama Settings (Only if in Dev Mode or if they were already there)
      if (values.apiUrl) {
        setApiUrl(values.apiUrl);
        localStorage.setItem('apiUrl', values.apiUrl);
      }
      if (values.modelName) {
        localStorage.setItem('modelName', values.modelName);
      }

      // 2. Update Profile Settings (if logged in)
      if (auth.currentUser) {
        // Update Auth Profile
        await updateProfile(auth.currentUser, {
          displayName: values.fullName
        });

        // Update Firestore
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          fullName: values.fullName,
          phoneNumber: values.phoneNumber || null,
          country: values.country || null,
          updatedAt: new Date().toISOString()
        }).catch(async (err) => {
          // If document doesn't exist, we might need to set it (fallback for very old users)
          if (err.code === 'not-found') {
            const { setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, 'users', auth.currentUser!.uid), {
              uid: auth.currentUser!.uid,
              fullName: values.fullName,
              email: auth.currentUser!.email,
              phoneNumber: values.phoneNumber || null,
              country: values.country || null,
              createdAt: new Date().toISOString()
            });
          } else {
            throw err;
          }
        });
      }

      message.success('Settings updated successfully');
      onClose();
    } catch (error: any) {
      console.error(error);
      message.error(error.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Settings"
      open={visible}
      onOk={handleOk}
      onCancel={onClose}
      okText="Save"
      confirmLoading={loading}
      width={500}
    >
      <Form form={form} layout="vertical" initialValues={{ 
        apiUrl: apiUrl,
        modelName: localStorage.getItem('modelName') || 'gemma3:1b'
      }}>
        {isDevMode && (
          <>
            <Title level={5}>AI Configuration</Title>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Configure your local Ollama connection. (Visible in Dev Mode only)
              </Text>
            </div>
            <Form.Item
              name="apiUrl"
              label="Ollama API URL"
              rules={[{ required: true, message: 'Please input the API URL!' }]}
            >
              <Input placeholder="https://your-url.ngrok-free.dev/api/chat" />
            </Form.Item>
            <Form.Item
              name="modelName"
              label="Ollama Model Name"
              rules={[{ required: true, message: 'Please input the model name!' }]}
            >
              <Input placeholder="gemma3:1b" />
            </Form.Item>
            <Divider />
          </>
        )}

        {auth.currentUser && (
          <>
            <Title level={5}>Profile Information</Title>
            <Form.Item
              name="fullName"
              label="Full Name"
              rules={[{ required: true, message: 'Please input your full name!' }]}
            >
              <Input placeholder="John Doe" />
            </Form.Item>

            <Form.Item
              name="phoneNumber"
              label="Phone Number"
            >
              <Input placeholder="+1 234 567 890" />
            </Form.Item>

            <Form.Item
              name="country"
              label="Country"
            >
              <Select
                placeholder="Select Country"
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {countries.map(country => (
                  <Option key={country.value} value={country.value}>{country.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default Settings;
