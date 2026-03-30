import React from 'react';
import { Modal, Form, Input, Typography } from 'antd';

const { Text } = Typography;

interface SettingsProps {
  visible: boolean;
  onClose: () => void;
  apiUrl: string;
  setApiUrl: (url: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ visible, onClose, apiUrl, setApiUrl }) => {
  const [form] = Form.useForm();

  const handleOk = () => {
    form.validateFields().then((values) => {
      setApiUrl(values.apiUrl);
      localStorage.setItem('apiUrl', values.apiUrl);
      if (values.modelName) localStorage.setItem('modelName', values.modelName);
      onClose();
    });
  };

  return (
    <Modal
      title="Settings"
      open={visible}
      onOk={handleOk}
      onCancel={onClose}
      okText="Save"
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Configure the endpoints below. If you deployed this app (e.g., to Vercel) but are running Ollama locally, use ngrok to expose your local port (e.g. <code>ngrok http 11434</code>) and enter the public URL here with <code>/api/chat</code> appended.
        </Text>
      </div>
      <Form form={form} layout="vertical" initialValues={{ 
        apiUrl: apiUrl,
        modelName: localStorage.getItem('modelName') || 'gemma3:1b'
      }}>
        {/* <Form.Item
          name="apiUrl"
          label="Ollama API URL"
          rules={[{ required: true, message: 'Please input the API URL!' }]}
        >
          <Input placeholder="---" />
        </Form.Item> */}
        <Form.Item
          name="modelName"
          label="Ollama Model Name"
          rules={[{ required: true, message: 'Please input the model name!' }]}
        >
          <Input placeholder="lindako..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default Settings;
