import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Typography, Divider, Select, message, Slider } from 'antd';
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
      if (values.ttsUrl) {
        localStorage.setItem('ttsUrl', values.ttsUrl);
      }
      
      // Advanced Audio Settings
      if (values.cpuThreads) localStorage.setItem('tts_cpuThreads', values.cpuThreads);
      if (values.attnBackend) localStorage.setItem('tts_attnBackend', values.attnBackend);
      if (values.textTemp) localStorage.setItem('tts_textTemp', values.textTemp);
      if (values.audioTemp) localStorage.setItem('tts_audioTemp', values.audioTemp);
      if (values.textTopP) localStorage.setItem('tts_textTopP', values.textTopP);
      if (values.audioTopP) localStorage.setItem('tts_audioTopP', values.audioTopP);
      if (values.textTopK) localStorage.setItem('tts_textTopK', values.textTopK);
      if (values.audioTopK) localStorage.setItem('tts_audioTopK', values.audioTopK);
      if (values.audioRepPenalty) localStorage.setItem('tts_audioRepPenalty', values.audioRepPenalty);

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
        modelName: localStorage.getItem('modelName') || 'gemma3:1b',
        ttsUrl: localStorage.getItem('ttsUrl') || 'https://mdx.tail299d7f.ts.net',
        cpuThreads: localStorage.getItem('tts_cpuThreads') || '6',
        attnBackend: localStorage.getItem('tts_attnBackend') || 'model_default',
        textTemp: localStorage.getItem('tts_textTemp') || '1.0',
        audioTemp: localStorage.getItem('tts_audioTemp') || '0.8',
        textTopP: localStorage.getItem('tts_textTopP') || '1.0',
        audioTopP: localStorage.getItem('tts_audioTopP') || '0.95',
        textTopK: localStorage.getItem('tts_textTopK') || '50',
        audioTopK: localStorage.getItem('tts_audioTopK') || '25',
        audioRepPenalty: localStorage.getItem('tts_audioRepPenalty') || '1.2'
      }}>
        <Title level={5}>AI Configuration</Title>
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Configure your local Ollama connection and MOSS-TTS tunnel.
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
        <Form.Item
          name="ttsUrl"
          label="MOSS-TTS API URL (Tunnel)"
          extra="Example: https://your-tunnel.loca.lt"
        >
          <Input placeholder="https://your-tunnel.loca.lt" />
        </Form.Item>

        <Title level={5}>Voice Interaction</Title>
        <Form.Item label="Speech Speed" tooltip="Adjust how fast she talks (Web Audio Playback Rate)">
          <Slider 
            min={0.5} 
            max={2.0} 
            step={0.1}
            defaultValue={parseFloat(localStorage.getItem('tts_speed') || '1.0')}
            onChange={(v) => localStorage.setItem('tts_speed', v.toString())}
          />
        </Form.Item>
        <Divider />

        <Title level={5}>Advanced TTS Parameters</Title>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item name="cpuThreads" label="CPU Threads">
            <Input type="number" placeholder="6" />
          </Form.Item>
          <Form.Item name="attnBackend" label="Attention Backend">
            <Select>
              <Option value="model_default">model_default</Option>
              <Option value="sdpa">sdpa</Option>
              <Option value="flash_attention_2">flash_attention_2</Option>
              <Option value="eager">eager</Option>
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item name="textTemp" label="Text Temperature">
            <Input type="number" step="0.1" placeholder="1.0" />
          </Form.Item>
          <Form.Item name="audioTemp" label="Audio Temperature">
            <Input type="number" step="0.1" placeholder="0.8" />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item name="textTopP" label="Text Top P">
            <Input type="number" step="0.05" placeholder="1.0" />
          </Form.Item>
          <Form.Item name="audioTopP" label="Audio Top P">
            <Input type="number" step="0.05" placeholder="0.95" />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item name="textTopK" label="Text Top K">
            <Input type="number" placeholder="50" />
          </Form.Item>
          <Form.Item name="audioTopK" label="Audio Top K">
            <Input type="number" placeholder="25" />
          </Form.Item>
        </div>

        <Form.Item name="audioRepPenalty" label="Audio Repetition Penalty">
          <Input type="number" step="0.1" placeholder="1.2" />
        </Form.Item>
        <Divider />

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
