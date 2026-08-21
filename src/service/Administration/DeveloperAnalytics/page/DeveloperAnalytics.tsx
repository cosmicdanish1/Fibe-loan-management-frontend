import React, { useState, useEffect } from 'react';
import { Card, Switch, Select, InputNumber, Button, message, Divider, Typography, Space, Alert, Statistic, Row, Col } from 'antd';
import { SettingOutlined, BarChartOutlined, BugOutlined, ClockCircleOutlined, DatabaseOutlined } from '@ant-design/icons';
import { apiService } from '../../../../services/api';
import { useComponentAnalytics } from '../../../../hooks/useAnalytics';
import { AnalyticsErrorBoundary } from '../../../../components/analytics/AnalyticsErrorBoundary';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface AnalyticsSettings {
  analytics_enabled: boolean;
  tracking_level: 'minimal' | 'standard' | 'detailed' | 'debug';
  data_retention_days: number;
  auto_cleanup_enabled: boolean;
  compression_enabled: boolean;
  batch_size: number;
  flush_interval_seconds: number;
  max_queue_size: number;
  error_threshold: number;
  performance_threshold_ms: number;
  real_time_alerts_enabled: boolean;
  anonymize_user_data: boolean;
  exclude_sensitive_data: boolean;
}

interface AnalyticsStatus {
  enabled: boolean;
  tracking_level: string;
  active_sessions: number;
  total_errors: number;
  unresolved_errors: number;
}

const DeveloperAnalytics: React.FC = () => {
  const analytics = useComponentAnalytics('DeveloperAnalytics');
  
  const [analyticsConfig, setAnalyticsConfig] = useState<AnalyticsSettings>({
    analytics_enabled: false,
    tracking_level: 'standard',
    data_retention_days: 90,
    auto_cleanup_enabled: true,
    compression_enabled: true,
    batch_size: 100,
    flush_interval_seconds: 30,
    max_queue_size: 1000,
    error_threshold: 10,
    performance_threshold_ms: 5000,
    real_time_alerts_enabled: false,
    anonymize_user_data: true,
    exclude_sensitive_data: true,
  });

  const [status, setStatus] = useState<AnalyticsStatus>({
    enabled: false,
    tracking_level: 'standard',
    active_sessions: 0,
    total_errors: 0,
    unresolved_errors: 0,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load current settings and status
  useEffect(() => {
    loadSettings();
    loadStatus();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await apiService.request('/analytics/config');
      if (response.success && response.data) {
        const configMap = new Map(response.data.map((item: any) => [item.config_key, item.config_value]));
        
        setAnalyticsConfig({
          analytics_enabled: configMap.get('analytics_enabled') === 'true',
          tracking_level: configMap.get('tracking_level') as any || 'standard',
          data_retention_days: parseInt(configMap.get('data_retention_days') || '90'),
          auto_cleanup_enabled: configMap.get('auto_cleanup_enabled') === 'true',
          compression_enabled: configMap.get('compression_enabled') === 'true',
          batch_size: parseInt(configMap.get('batch_size') || '100'),
          flush_interval_seconds: parseInt(configMap.get('flush_interval_seconds') || '30'),
          max_queue_size: parseInt(configMap.get('max_queue_size') || '1000'),
          error_threshold: parseInt(configMap.get('error_threshold') || '10'),
          performance_threshold_ms: parseInt(configMap.get('performance_threshold_ms') || '5000'),
          real_time_alerts_enabled: configMap.get('real_time_alerts_enabled') === 'true',
          anonymize_user_data: configMap.get('anonymize_user_data') === 'true',
          exclude_sensitive_data: configMap.get('exclude_sensitive_data') === 'true',
        });
      }
    } catch (error) {
      console.error('Failed to load analytics settings:', error);
      message.error('Failed to load analytics settings');
    } finally {
      setLoading(false);
    }
  };

  const loadStatus = async () => {
    try {
      const response = await apiService.request('/analytics/status');
      if (response.success && response.data) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to load analytics status:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      analytics.trackFeatureUsage({
        featureCategory: 'Analytics',
        featureName: 'Save Settings',
        actionType: 'submit',
        sessionId: '',
      });

      const response = await apiService.request('/analytics/settings', {
        method: 'PUT',
        body: JSON.stringify(analyticsConfig),
      });

      if (response.success) {
        message.success('Analytics settings saved successfully');
        await loadStatus(); // Refresh status after saving
        
        analytics.trackFeatureUsage({
          featureCategory: 'Analytics',
          featureName: 'Save Settings',
          actionType: 'submit',
          successStatus: true,
          sessionId: '',
        });
      } else {
        message.error('Failed to save analytics settings');
        analytics.trackFeatureUsage({
          featureCategory: 'Analytics',
          featureName: 'Save Settings',
          actionType: 'submit',
          successStatus: false,
          errorMessage: 'API request failed',
          sessionId: '',
        });
      }
    } catch (error) {
      console.error('Failed to save analytics settings:', error);
      message.error('Failed to save analytics settings');
      analytics.trackError(error as Error, 'DeveloperAnalytics', 'Save Settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key: keyof AnalyticsSettings, value: any) => {
    setAnalyticsConfig(prev => ({
      ...prev,
      [key]: value,
    }));
    
    // Track configuration changes
    analytics.trackFeatureUsage({
      featureCategory: 'Analytics',
      featureName: 'Configuration Change',
      subFeature: key,
      actionType: 'click',
      actionDetails: { setting: key, newValue: value },
      sessionId: '',
    });
  };

  const resetToDefaults = () => {
    setAnalyticsConfig({
      analytics_enabled: false,
      tracking_level: 'standard',
      data_retention_days: 90,
      auto_cleanup_enabled: true,
      compression_enabled: true,
      batch_size: 100,
      flush_interval_seconds: 30,
      max_queue_size: 1000,
      error_threshold: 10,
      performance_threshold_ms: 5000,
      real_time_alerts_enabled: false,
      anonymize_user_data: true,
      exclude_sensitive_data: true,
    });
    message.info('Settings reset to defaults');
    
    analytics.trackButtonClick('Reset to Defaults', 'Analytics');
  };

  usePageToolbarActions({
    onSave: saveSettings,
    saveLabel: 'Save Settings',
    saveEnabled: !saving,
  });

  return (
    <AnalyticsErrorBoundary componentName="DeveloperAnalytics">
      <div className="h-screen flex flex-col overflow-auto bg-slate-50 p-4">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <Card className="shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <Title level={3} className="mb-2 flex items-center">
                <BarChartOutlined className="mr-3 text-blue-600" />
                Developer Analytics & Tracking
              </Title>
              <Paragraph className="text-gray-600 mb-0">
                Configure analytics tracking for development insights and user behavior analysis.
                This system helps developers understand application usage patterns and identify issues.
              </Paragraph>
            </div>
            <div className="text-right">
              <Text type="secondary">Status: </Text>
              <Text strong className={status.enabled ? 'text-green-600' : 'text-red-600'}>
                {status.enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </div>
          </div>
        </Card>

        {/* Status Overview */}
        <Card title="Analytics Status Overview" className="shadow-sm">
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Active Sessions"
                value={status.active_sessions}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Total Errors"
                value={status.total_errors}
                prefix={<BugOutlined />}
                valueStyle={{ color: status.total_errors > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Unresolved Errors"
                value={status.unresolved_errors}
                prefix={<BugOutlined />}
                valueStyle={{ color: status.unresolved_errors > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Tracking Level"
                value={status.tracking_level}
                prefix={<SettingOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
          </Row>
        </Card>

        {/* Main Settings */}
        <Card title="Analytics Configuration" className="shadow-sm">
          
          {/* Enable/Disable Analytics */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Text strong className="text-lg">Enable Analytics Tracking</Text>
                <br />
                <Text type="secondary">
                  Master switch to enable or disable all analytics tracking. 
                  When disabled, no user data will be collected.
                </Text>
              </div>
              <Switch
                checked={analyticsConfig.analytics_enabled}
                onChange={(checked) => handleSettingChange('analytics_enabled', checked)}
                size="large"
              />
            </div>
            
            {!analyticsConfig.analytics_enabled && (
              <Alert
                message="Analytics Disabled"
                description="Analytics tracking is currently disabled. Enable it to start collecting usage data and error reports."
                type="warning"
                showIcon
                className="mb-4"
              />
            )}
          </div>

          <Divider />

          {/* Tracking Level */}
          <div className="mb-6">
            <Text strong className="block mb-2">Tracking Level</Text>
            <Text type="secondary" className="block mb-3">
              Choose how much data to collect. Higher levels provide more insights but use more storage.
            </Text>
            <Select
              value={analyticsConfig.tracking_level}
              onChange={(value) => handleSettingChange('tracking_level', value)}
              className="w-full max-w-xs"
              disabled={!analyticsConfig.analytics_enabled}
            >
              <Option value="minimal">
                <div>
                  <div>Minimal</div>
                  <div className="text-xs text-gray-500">Only errors and critical events</div>
                </div>
              </Option>
              <Option value="standard">
                <div>
                  <div>Standard</div>
                  <div className="text-xs text-gray-500">Errors, page views, and basic interactions</div>
                </div>
              </Option>
              <Option value="detailed">
                <div>
                  <div>Detailed</div>
                  <div className="text-xs text-gray-500">All interactions, performance metrics</div>
                </div>
              </Option>
              <Option value="debug">
                <div>
                  <div>Debug</div>
                  <div className="text-xs text-gray-500">Everything including debug information</div>
                </div>
              </Option>
            </Select>
          </div>

          <Divider />

          {/* Privacy Settings */}
          <div className="mb-6">
            <Text strong className="block mb-3">Privacy & Security Settings</Text>
            
            <Space direction="vertical" className="w-full" size="middle">
              <div className="flex items-center justify-between">
                <div>
                  <Text>Anonymize User Data</Text>
                  <br />
                  <Text type="secondary" className="text-sm">
                    Replace usernames and personal identifiers with anonymous tokens
                  </Text>
                </div>
                <Switch
                  checked={analyticsConfig.anonymize_user_data}
                  onChange={(checked) => handleSettingChange('anonymize_user_data', checked)}
                  disabled={!analyticsConfig.analytics_enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Text>Exclude Sensitive Data</Text>
                  <br />
                  <Text type="secondary" className="text-sm">
                    Automatically filter out passwords, tokens, and other sensitive information
                  </Text>
                </div>
                <Switch
                  checked={analyticsConfig.exclude_sensitive_data}
                  onChange={(checked) => handleSettingChange('exclude_sensitive_data', checked)}
                  disabled={!analyticsConfig.analytics_enabled}
                />
              </div>
            </Space>
          </div>

          <Divider />

          {/* Data Management */}
          <div className="mb-6">
            <Text strong className="block mb-3">Data Management</Text>
            
            <Row gutter={16}>
              <Col span={12}>
                <div className="mb-4">
                  <Text className="block mb-2">Data Retention (Days)</Text>
                  <Text type="secondary" className="block mb-2 text-sm">
                    How long to keep analytics data before automatic cleanup
                  </Text>
                  <InputNumber
                    value={analyticsConfig.data_retention_days}
                    onChange={(value) => handleSettingChange('data_retention_days', value || 90)}
                    min={7}
                    max={365}
                    className="w-full"
                    disabled={!analyticsConfig.analytics_enabled}
                  />
                </div>
              </Col>
              
              <Col span={12}>
                <div className="mb-4">
                  <Text className="block mb-2">Error Alert Threshold</Text>
                  <Text type="secondary" className="block mb-2 text-sm">
                    Number of errors before triggering alerts
                  </Text>
                  <InputNumber
                    value={analyticsConfig.error_threshold}
                    onChange={(value) => handleSettingChange('error_threshold', value || 10)}
                    min={1}
                    max={100}
                    className="w-full"
                    disabled={!analyticsConfig.analytics_enabled}
                  />
                </div>
              </Col>
            </Row>

            <Space direction="vertical" className="w-full" size="middle">
              <div className="flex items-center justify-between">
                <div>
                  <Text>Auto Cleanup</Text>
                  <br />
                  <Text type="secondary" className="text-sm">
                    Automatically delete old data based on retention period
                  </Text>
                </div>
                <Switch
                  checked={analyticsConfig.auto_cleanup_enabled}
                  onChange={(checked) => handleSettingChange('auto_cleanup_enabled', checked)}
                  disabled={!analyticsConfig.analytics_enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Text>Data Compression</Text>
                  <br />
                  <Text type="secondary" className="text-sm">
                    Compress old data to save storage space
                  </Text>
                </div>
                <Switch
                  checked={analyticsConfig.compression_enabled}
                  onChange={(checked) => handleSettingChange('compression_enabled', checked)}
                  disabled={!analyticsConfig.analytics_enabled}
                />
              </div>
            </Space>
          </div>

          <Divider />

          {/* Performance Settings */}
          <div className="mb-6">
            <Text strong className="block mb-3">Performance Settings</Text>
            
            <Row gutter={16}>
              <Col span={8}>
                <div className="mb-4">
                  <Text className="block mb-2">Batch Size</Text>
                  <Text type="secondary" className="block mb-2 text-sm">
                    Number of events to process in each batch
                  </Text>
                  <InputNumber
                    value={analyticsConfig.batch_size}
                    onChange={(value) => handleSettingChange('batch_size', value || 100)}
                    min={10}
                    max={1000}
                    className="w-full"
                    disabled={!analyticsConfig.analytics_enabled}
                  />
                </div>
              </Col>
              
              <Col span={8}>
                <div className="mb-4">
                  <Text className="block mb-2">Flush Interval (Seconds)</Text>
                  <Text type="secondary" className="block mb-2 text-sm">
                    How often to send queued events to server
                  </Text>
                  <InputNumber
                    value={analyticsConfig.flush_interval_seconds}
                    onChange={(value) => handleSettingChange('flush_interval_seconds', value || 30)}
                    min={5}
                    max={300}
                    className="w-full"
                    disabled={!analyticsConfig.analytics_enabled}
                  />
                </div>
              </Col>
              
              <Col span={8}>
                <div className="mb-4">
                  <Text className="block mb-2">Max Queue Size</Text>
                  <Text type="secondary" className="block mb-2 text-sm">
                    Maximum events to queue before forced flush
                  </Text>
                  <InputNumber
                    value={analyticsConfig.max_queue_size}
                    onChange={(value) => handleSettingChange('max_queue_size', value || 1000)}
                    min={50}
                    max={5000}
                    className="w-full"
                    disabled={!analyticsConfig.analytics_enabled}
                  />
                </div>
              </Col>
            </Row>
          </div>

          <Divider />

          {/* Alerts */}
          <div className="mb-6">
            <Text strong className="block mb-3">Alert Settings</Text>
            
            <Row gutter={16}>
              <Col span={12}>
                <div className="mb-4">
                  <Text className="block mb-2">Performance Threshold (ms)</Text>
                  <Text type="secondary" className="block mb-2 text-sm">
                    Alert when operations exceed this duration
                  </Text>
                  <InputNumber
                    value={analyticsConfig.performance_threshold_ms}
                    onChange={(value) => handleSettingChange('performance_threshold_ms', value || 5000)}
                    min={100}
                    max={30000}
                    className="w-full"
                    disabled={!analyticsConfig.analytics_enabled}
                  />
                </div>
              </Col>
              
              <Col span={12}>
                <div className="flex items-center justify-between h-full">
                  <div>
                    <Text>Real-time Alerts</Text>
                    <br />
                    <Text type="secondary" className="text-sm">
                      Enable immediate notifications for critical issues
                    </Text>
                  </div>
                  <Switch
                    checked={analyticsConfig.real_time_alerts_enabled}
                    onChange={(checked) => handleSettingChange('real_time_alerts_enabled', checked)}
                    disabled={!analyticsConfig.analytics_enabled}
                  />
                </div>
              </Col>
            </Row>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button onClick={resetToDefaults} disabled={saving}>
              Reset to Defaults
            </Button>
            
            <Space>
              <Button onClick={loadSettings} loading={loading}>
                Reload Settings
              </Button>
              <Button 
                type="primary" 
                onClick={saveSettings} 
                loading={saving}
                icon={<DatabaseOutlined />}
              >
                Save Settings
              </Button>
            </Space>
          </div>
        </Card>

        {/* Information Card */}
        <Card title="Important Information" className="shadow-sm">
          <Alert
            message="Analytics Data Storage"
            description="Analytics data is stored in a separate database (EMP_Analytics_DB) and does not affect your main application data. All tracking is optional and can be disabled at any time."
            type="info"
            showIcon
            className="mb-4"
          />
          
          <Alert
            message="Privacy Compliance"
            description="This analytics system is designed to be privacy-compliant. Personal data is anonymized by default, and sensitive information is automatically excluded from tracking."
            type="success"
            showIcon
            className="mb-4"
          />
          
          <Alert
            message="Performance Impact"
            description="Analytics tracking is designed to have minimal impact on application performance. Data is processed asynchronously and sent in batches to avoid blocking the user interface."
            type="warning"
            showIcon
          />
        </Card>
      </div>
    </div>
    </AnalyticsErrorBoundary>
  );
};

export default DeveloperAnalytics;
