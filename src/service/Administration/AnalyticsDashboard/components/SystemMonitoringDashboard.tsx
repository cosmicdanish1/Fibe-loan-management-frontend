import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Alert, Button, Tabs, Tag, Badge, Timeline, Switch, InputNumber, Form } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { 
  AlertOutlined, 
  ThunderboltOutlined, 
  DatabaseOutlined,
  ApiOutlined,
  CloudServerOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { analyticsMonitoring, SystemHealth, PerformanceProfile, MonitoringConfig } from '../../../../services/analyticsMonitoring';
import { AnalyticsErrorBoundary } from '../../../../components/analytics/AnalyticsErrorBoundary';

const { TabPane } = Tabs;

const SystemMonitoringDashboard: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [performanceProfiles, setPerformanceProfiles] = useState<PerformanceProfile[]>([]);
  const [, setAlertHistory] = useState<Array<any>>([]);
  const [config, setConfig] = useState<MonitoringConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load monitoring data
  const loadMonitoringData = () => {
    setSystemHealth(analyticsMonitoring.getSystemHealth());
    setPerformanceProfiles(analyticsMonitoring.getPerformanceProfiles());
    setAlertHistory(analyticsMonitoring.getAlertHistory());
    setConfig(analyticsMonitoring.getConfiguration());
    setLoading(false);
  };

  // Initialize monitoring
  useEffect(() => {
    analyticsMonitoring.initialize().then(() => {
      loadMonitoringData();
    });
  }, []);

  // Auto-refresh data
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadMonitoringData, 10000); // Every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Handle alert resolution
  const handleResolveAlert = (alertId: string) => {
    analyticsMonitoring.resolveAlert(alertId);
    loadMonitoringData();
  };

  // Handle configuration update
  const handleConfigUpdate = (newConfig: Partial<MonitoringConfig>) => {
    analyticsMonitoring.updateConfiguration(newConfig);
    setConfig(analyticsMonitoring.getConfiguration());
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': case 'up': return 'green';
      case 'warning': case 'slow': return 'orange';
      case 'critical': case 'down': return 'red';
      default: return 'gray';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': case 'up': return <CheckCircleOutlined />;
      case 'warning': case 'slow': return <ExclamationCircleOutlined />;
      case 'critical': case 'down': return <CloseCircleOutlined />;
      default: return <SyncOutlined />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading system monitoring...</p>
        </div>
      </div>
    );
  }

  if (!systemHealth || !config) {
    return (
      <Alert
        message="Monitoring Data Unavailable"
        description="Unable to load system monitoring data. Please check the monitoring service."
        type="error"
        showIcon
      />
    );
  }

  // Prepare performance chart data
  const performanceChartData = performanceProfiles.slice(0, 20).reverse().map((profile) => ({
    time: new Date(profile.timestamp).toLocaleTimeString(),
    duration: profile.duration,
    memory: (profile.memoryAfter - profile.memoryBefore) / 1024 / 1024, // MB
  }));

  // Prepare system metrics chart data
  const metricsHistory = Array.from({ length: 10 }, (_, i) => ({
    time: new Date(Date.now() - (9 - i) * 60000).toLocaleTimeString(),
    cpu: Math.max(0, systemHealth.metrics.cpu + (Math.random() - 0.5) * 20),
    memory: Math.max(0, systemHealth.metrics.memory + (Math.random() - 0.5) * 10),
    disk: Math.max(0, systemHealth.metrics.disk + (Math.random() - 0.5) * 5),
    network: Math.max(0, systemHealth.metrics.network + (Math.random() - 0.5) * 15),
  }));

  const activeAlerts = systemHealth.alerts.filter(alert => !alert.resolved);
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');

  return (
    <AnalyticsErrorBoundary componentName="SystemMonitoringDashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-800">🔧 System Monitoring</h2>
            <Badge 
              status={systemHealth.status === 'healthy' ? 'success' : 
                     systemHealth.status === 'warning' ? 'warning' : 'error'} 
              text={systemHealth.status.toUpperCase()}
            />
            <span className="text-sm text-gray-500">
              Uptime: {Math.floor(systemHealth.uptime / 1000 / 60)} minutes
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              checkedChildren="Auto"
              unCheckedChildren="Manual"
            />
            <Button onClick={loadMonitoringData} loading={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <Alert
            message={`${criticalAlerts.length} Critical Alert(s)`}
            description={
              <div className="space-y-1">
                {criticalAlerts.slice(0, 3).map(alert => (
                  <div key={alert.id} className="text-sm">
                    {alert.message} - {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                ))}
              </div>
            }
            type="error"
            showIcon
            closable
          />
        )}

        {/* System Status Overview */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card className="text-center">
              <Statistic
                title="System Status"
                value={systemHealth.status}
                prefix={getStatusIcon(systemHealth.status)}
                valueStyle={{ color: getStatusColor(systemHealth.status) }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card className="text-center">
              <Statistic
                title="Active Alerts"
                value={activeAlerts.length}
                prefix={<AlertOutlined />}
                valueStyle={{ color: activeAlerts.length > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card className="text-center">
              <Statistic
                title="Services Up"
                value={`${Object.values(systemHealth.services).filter(s => s === 'up').length}/4`}
                prefix={<CloudServerOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card className="text-center">
              <Statistic
                title="Memory Usage"
                value={`${Math.round(systemHealth.metrics.memory)}%`}
                prefix={<ThunderboltOutlined />}
                valueStyle={{ 
                  color: systemHealth.metrics.memory > 80 ? '#ff4d4f' : 
                         systemHealth.metrics.memory > 60 ? '#faad14' : '#52c41a' 
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Services Status */}
        <Card title="Services Status">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" className="text-center">
                <div className="flex flex-col items-center space-y-2">
                  <DatabaseOutlined className={`text-2xl text-${getStatusColor(systemHealth.services.database)}-500`} />
                  <div>
                    <div className="font-semibold">Database</div>
                    <Tag color={getStatusColor(systemHealth.services.database)}>
                      {systemHealth.services.database}
                    </Tag>
                  </div>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <Card size="small" className="text-center">
                <div className="flex flex-col items-center space-y-2">
                  <ApiOutlined className={`text-2xl text-${getStatusColor(systemHealth.services.api)}-500`} />
                  <div>
                    <div className="font-semibold">API</div>
                    <Tag color={getStatusColor(systemHealth.services.api)}>
                      {systemHealth.services.api}
                    </Tag>
                  </div>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <Card size="small" className="text-center">
                <div className="flex flex-col items-center space-y-2">
                  <ThunderboltOutlined className={`text-2xl text-${getStatusColor(systemHealth.services.websocket)}-500`} />
                  <div>
                    <div className="font-semibold">WebSocket</div>
                    <Tag color={getStatusColor(systemHealth.services.websocket)}>
                      {systemHealth.services.websocket}
                    </Tag>
                  </div>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <Card size="small" className="text-center">
                <div className="flex flex-col items-center space-y-2">
                  <CloudServerOutlined className={`text-2xl text-${getStatusColor(systemHealth.services.storage)}-500`} />
                  <div>
                    <div className="font-semibold">Storage</div>
                    <Tag color={getStatusColor(systemHealth.services.storage)}>
                      {systemHealth.services.storage}
                    </Tag>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* Detailed Monitoring Tabs */}
        <Card>
          <Tabs defaultActiveKey="metrics">
            <TabPane tab="System Metrics" key="metrics">
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                  <Card title="Resource Usage Trends" size="small">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={metricsHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Area type="monotone" dataKey="cpu" stackId="1" stroke="#8884d8" fill="#8884d8" name="CPU %" />
                        <Area type="monotone" dataKey="memory" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Memory %" />
                        <Area type="monotone" dataKey="network" stackId="1" stroke="#ffc658" fill="#ffc658" name="Network %" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                
                <Col xs={24} lg={8}>
                  <div className="space-y-4">
                    <Card title="Current Usage" size="small">
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>CPU</span>
                            <span>{Math.round(systemHealth.metrics.cpu)}%</span>
                          </div>
                          <Progress 
                            percent={systemHealth.metrics.cpu} 
                            status={systemHealth.metrics.cpu > 80 ? "exception" : "success"}
                            size="small"
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>Memory</span>
                            <span>{Math.round(systemHealth.metrics.memory)}%</span>
                          </div>
                          <Progress 
                            percent={systemHealth.metrics.memory} 
                            status={systemHealth.metrics.memory > 80 ? "exception" : "success"}
                            size="small"
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>Disk</span>
                            <span>{Math.round(systemHealth.metrics.disk)}%</span>
                          </div>
                          <Progress 
                            percent={systemHealth.metrics.disk} 
                            status={systemHealth.metrics.disk > 85 ? "exception" : "success"}
                            size="small"
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>Network</span>
                            <span>{Math.round(systemHealth.metrics.network)}%</span>
                          </div>
                          <Progress 
                            percent={systemHealth.metrics.network} 
                            size="small"
                          />
                        </div>
                      </div>
                    </Card>
                  </div>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab={
              <span>
                Alerts 
                {activeAlerts.length > 0 && <Badge count={activeAlerts.length} size="small" className="ml-1" />}
              </span>
            } key="alerts">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Active Alerts</h3>
                  <Button 
                    size="small" 
                    onClick={() => activeAlerts.forEach(alert => handleResolveAlert(alert.id))}
                    disabled={activeAlerts.length === 0}
                  >
                    Resolve All
                  </Button>
                </div>
                
                <Timeline>
                  {activeAlerts.length > 0 ? (
                    activeAlerts.map(alert => (
                      <Timeline.Item
                        key={alert.id}
                        color={getStatusColor(alert.severity)}
                        dot={getStatusIcon(alert.severity)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <Tag color={getStatusColor(alert.severity)}>
                                {alert.severity.toUpperCase()}
                              </Tag>
                              <span className="font-medium">{alert.message}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(alert.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <Button 
                            size="small" 
                            onClick={() => handleResolveAlert(alert.id)}
                          >
                            Resolve
                          </Button>
                        </div>
                      </Timeline.Item>
                    ))
                  ) : (
                    <Timeline.Item color="green" dot={<CheckCircleOutlined />}>
                      <div className="text-green-600">No active alerts - System is healthy</div>
                    </Timeline.Item>
                  )}
                </Timeline>
              </div>
            </TabPane>

            <TabPane tab="Performance" key="performance">
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card title="Performance Profiles" size="small">
                    {performanceProfiles.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={performanceChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <RechartsTooltip />
                          <Legend />
                          <Line type="monotone" dataKey="duration" stroke="#8884d8" name="Duration (ms)" />
                          <Line type="monotone" dataKey="memory" stroke="#82ca9d" name="Memory Delta (MB)" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <ThunderboltOutlined className="text-3xl mb-2" />
                        <p>No performance data available</p>
                        <p className="text-sm">Enable performance profiling in configuration</p>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="Configuration" key="config">
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Card title="Alert Thresholds" size="small">
                    <Form layout="vertical" size="small">
                      <Form.Item label="Error Rate (per minute)">
                        <InputNumber
                          value={config.alertThresholds.errorRate}
                          onChange={(value) => handleConfigUpdate({
                            alertThresholds: { ...config.alertThresholds, errorRate: value || 5 }
                          })}
                          min={1}
                          max={100}
                        />
                      </Form.Item>
                      
                      <Form.Item label="Response Time (ms)">
                        <InputNumber
                          value={config.alertThresholds.responseTime}
                          onChange={(value) => handleConfigUpdate({
                            alertThresholds: { ...config.alertThresholds, responseTime: value || 3000 }
                          })}
                          min={100}
                          max={10000}
                        />
                      </Form.Item>
                      
                      <Form.Item label="Memory Usage (%)">
                        <InputNumber
                          value={config.alertThresholds.memoryUsage}
                          onChange={(value) => handleConfigUpdate({
                            alertThresholds: { ...config.alertThresholds, memoryUsage: value || 80 }
                          })}
                          min={50}
                          max={95}
                        />
                      </Form.Item>
                    </Form>
                  </Card>
                </Col>
                
                <Col xs={24} md={12}>
                  <Card title="Monitoring Settings" size="small">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Enable Monitoring</span>
                        <Switch
                          checked={config.enabled}
                          onChange={(enabled) => handleConfigUpdate({ enabled })}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>Browser Notifications</span>
                        <Switch
                          checked={config.notifications.browser}
                          onChange={(browser) => handleConfigUpdate({
                            notifications: { ...config.notifications, browser }
                          })}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>Performance Profiling</span>
                        <Switch
                          checked={config.performance.enableProfiling}
                          onChange={(enableProfiling) => handleConfigUpdate({
                            performance: { ...config.performance, enableProfiling }
                          })}
                        />
                      </div>
                      
                      <div>
                        <div className="mb-2">Health Check Interval (seconds)</div>
                        <InputNumber
                          value={config.healthChecks.interval / 1000}
                          onChange={(value) => handleConfigUpdate({
                            healthChecks: { ...config.healthChecks, interval: (value || 30) * 1000 }
                          })}
                          min={10}
                          max={300}
                        />
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </Card>
      </div>
    </AnalyticsErrorBoundary>
  );
};

export default SystemMonitoringDashboard;
