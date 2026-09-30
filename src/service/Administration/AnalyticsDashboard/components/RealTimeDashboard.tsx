import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Badge, Alert, Button, Tabs, Timeline, Progress, Tag, Tooltip } from 'antd';
import { 
  UserOutlined, 
  EyeOutlined, 
  BugOutlined, 
  ClockCircleOutlined, 
  ThunderboltOutlined,
  AlertOutlined,
  TrophyOutlined,
  RocketOutlined,
  HeartOutlined
} from '@ant-design/icons';
import { useRealTimeDashboard } from '../../../../hooks/useRealTimeAnalytics';
import { AnalyticsErrorBoundary } from '../../../../components/analytics/AnalyticsErrorBoundary';

const { TabPane } = Tabs;

const RealTimeDashboard: React.FC = () => {
  const {
    metrics,
    isConnected,
    currentJourney,
    insights,
    criticalInsights,
    alerts,
    unreadAlerts,
    conversions,
    conversionRate,
    dashboardState,
    refreshAll,
    trackAction,
    markAlertsAsRead,
    dismissAlert,
  } = useRealTimeDashboard();

  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshAll();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshAll]);

  // Track dashboard interactions
  const handleTabChange = (key: string) => {
    trackAction('dashboard_tab_change', { tab: key });
  };

  const handleRefreshClick = () => {
    trackAction('dashboard_refresh', { manual: true });
    refreshAll();
  };

  const handleAlertClick = (alertId: string) => {
    trackAction('alert_clicked', { alertId });
    dismissAlert(alertId);
  };

  if (dashboardState.isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading real-time analytics...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Alert
        message="Real-time Data Unavailable"
        description="Unable to load real-time analytics data. Please check your connection and try again."
        type="warning"
        showIcon
        action={
          <Button size="small" onClick={handleRefreshClick}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <AnalyticsErrorBoundary componentName="RealTimeDashboard">
      <div className="space-y-6">
        {/* Header with Connection Status */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-800">📊 Real-Time Analytics</h2>
            <Badge 
              status={isConnected ? "processing" : "error"} 
              text={isConnected ? "Live" : "Disconnected"}
            />
            {dashboardState.lastRefresh && (
              <span className="text-sm text-gray-500">
                Last updated: {dashboardState.lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="small"
              onClick={() => setAutoRefresh(!autoRefresh)}
              type={autoRefresh ? "primary" : "default"}
            >
              Auto-refresh: {autoRefresh ? "ON" : "OFF"}
            </Button>
            <Button onClick={handleRefreshClick} loading={dashboardState.isLoading}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Critical Alerts */}
        {criticalInsights.length > 0 && (
          <Alert
            message="Critical Performance Issues Detected"
            description={
              <div className="space-y-2">
                {criticalInsights.slice(0, 3).map((insight, index) => (
                  <div key={index} className="text-sm">
                    <strong>{insight.metric}:</strong> {insight.recommendation}
                  </div>
                ))}
              </div>
            }
            type="error"
            showIcon
            closable
          />
        )}

        {/* Real-time Metrics Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card className="text-center">
              <Statistic
                title="Active Users"
                value={metrics.activeUsers}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
                suffix={
                  <Tooltip title="Users currently online">
                    <HeartOutlined className="text-red-500 animate-pulse" />
                  </Tooltip>
                }
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card className="text-center">
              <Statistic
                title="Current Sessions"
                value={metrics.currentSessions}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card className="text-center">
              <Statistic
                title="Page Views"
                value={metrics.pageViews}
                prefix={<EyeOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card className="text-center">
              <Statistic
                title="Errors/Min"
                value={metrics.errorsPerMinute}
                prefix={<BugOutlined />}
                valueStyle={{ color: metrics.errorsPerMinute > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Performance Metrics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Response Time" className="h-80">
              <div className="mb-4">
                <Progress
                  percent={Math.min((metrics.averageResponseTime / 5000) * 100, 100)}
                  status={metrics.averageResponseTime > 3000 ? "exception" : "success"}
                  format={() => `${Math.round(metrics.averageResponseTime)}ms`}
                />
              </div>
              <div className="text-sm text-gray-600">
                <p>Current: {Math.round(metrics.averageResponseTime)}ms</p>
                <p>Target: &lt; 2000ms</p>
                <p>Alert Threshold: 3000ms</p>
              </div>
            </Card>
          </Col>
          
          <Col xs={24} md={12}>
            <Card title="Conversion Rate" className="h-80">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {conversionRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  {conversions.length} conversions tracked
                </div>
                <Progress
                  type="circle"
                  percent={conversionRate}
                  format={percent => `${percent}%`}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </div>
            </Card>
          </Col>
        </Row>

        {/* Detailed Analytics Tabs */}
        <Card>
          <Tabs defaultActiveKey="activity" onChange={handleTabChange}>
            <TabPane tab="Live Activity" key="activity">
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="Top Active Pages" size="small">
                    <div className="space-y-3">
                      {metrics.topActivePages.map((page, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm truncate flex-1">{page.page}</span>
                          <div className="flex items-center space-x-2">
                            <Badge count={page.activeUsers} showZero />
                            <UserOutlined className="text-gray-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Col>
                
                <Col xs={24} lg={12}>
                  <Card title="Recent Errors" size="small">
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {metrics.recentErrors.length > 0 ? (
                        metrics.recentErrors.map((error, index) => (
                          <div key={index} className="border-l-4 border-red-400 pl-3 py-1">
                            <div className="flex justify-between items-start">
                              <span className="text-sm text-gray-800">{error.error}</span>
                              <Tag color={error.severity === 'high' ? 'red' : error.severity === 'medium' ? 'orange' : 'blue'}>
                                {error.severity}
                              </Tag>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(error.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          <BugOutlined className="text-2xl mb-2" />
                          <p>No recent errors</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab={
              <span>
                Alerts 
                {unreadAlerts > 0 && <Badge count={unreadAlerts} size="small" className="ml-1" />}
              </span>
            } key="alerts">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">System Alerts</h3>
                  {unreadAlerts > 0 && (
                    <Button size="small" onClick={markAlertsAsRead}>
                      Mark all as read
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <Alert
                        key={alert.id}
                        message={alert.message}
                        type={alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warning' : 'info'}
                        showIcon
                        closable
                        onClose={() => handleAlertClick(alert.id)}
                        description={
                          <div className="text-xs text-gray-500">
                            {alert.type} • {new Date(alert.timestamp).toLocaleString()}
                          </div>
                        }
                      />
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <AlertOutlined className="text-3xl mb-2" />
                      <p>No active alerts</p>
                    </div>
                  )}
                </div>
              </div>
            </TabPane>

            <TabPane tab="User Journeys" key="journeys">
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="Current Session Journey" size="small">
                    {currentJourney ? (
                      <div>
                        <div className="mb-4">
                          <p><strong>Session:</strong> {currentJourney.sessionId.slice(-8)}</p>
                          <p><strong>Duration:</strong> {Math.round((Date.now() - new Date(currentJourney.startTime).getTime()) / 1000 / 60)} minutes</p>
                          <p><strong>Current Page:</strong> {currentJourney.currentPage}</p>
                        </div>
                        
                        <Timeline size="small">
                          {currentJourney.pageSequence.slice(-5).map((page, index) => (
                            <Timeline.Item key={index}>
                              <div>
                                <div className="font-medium">{page.page}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(page.timestamp).toLocaleTimeString()}
                                  {page.duration > 0 && ` • ${Math.round(page.duration / 1000)}s`}
                                </div>
                                {page.actions.length > 0 && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    {page.actions.length} action(s)
                                  </div>
                                )}
                              </div>
                            </Timeline.Item>
                          ))}
                        </Timeline>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        <UserOutlined className="text-2xl mb-2" />
                        <p>No active journey</p>
                      </div>
                    )}
                  </Card>
                </Col>
                
                <Col xs={24} lg={12}>
                  <Card title="Recent Conversions" size="small">
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {conversions.slice(0, 10).map((conversion, index) => (
                        <div key={index} className="border-l-4 border-green-400 pl-3 py-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{conversion.event}</span>
                            {conversion.value && (
                              <Tag color="green">${conversion.value}</Tag>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Session: {conversion.sessionId.slice(-8)} • {new Date(conversion.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                      
                      {conversions.length === 0 && (
                        <div className="text-center text-gray-500 py-4">
                          <TrophyOutlined className="text-2xl mb-2" />
                          <p>No conversions yet</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="Performance Insights" key="performance">
              <div className="space-y-4">
                {insights.length > 0 ? (
                  insights.map((insight, index) => (
                    <Card key={index} size="small" className={`border-l-4 ${
                      insight.impact === 'critical' ? 'border-red-500' :
                      insight.impact === 'high' ? 'border-orange-500' :
                      insight.impact === 'medium' ? 'border-yellow-500' : 'border-blue-500'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold">{insight.metric}</h4>
                            <Tag color={
                              insight.impact === 'critical' ? 'red' :
                              insight.impact === 'high' ? 'orange' :
                              insight.impact === 'medium' ? 'gold' : 'blue'
                            }>
                              {insight.impact}
                            </Tag>
                            <Tag color={insight.trend === 'improving' ? 'green' : insight.trend === 'degrading' ? 'red' : 'blue'}>
                              {insight.trend}
                            </Tag>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{insight.recommendation}</p>
                          <div className="text-xs text-gray-500">
                            Current: {insight.currentValue} | Threshold: {insight.threshold}
                          </div>
                        </div>
                        <div className="text-right">
                          {insight.impact === 'critical' ? <AlertOutlined className="text-red-500" /> :
                           insight.impact === 'high' ? <ThunderboltOutlined className="text-orange-500" /> :
                           <RocketOutlined className="text-blue-500" />}
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <RocketOutlined className="text-3xl mb-2" />
                    <p>No performance insights available</p>
                    <p className="text-sm">System is performing optimally</p>
                  </div>
                )}
              </div>
            </TabPane>
          </Tabs>
        </Card>
      </div>
    </AnalyticsErrorBoundary>
  );
};

export default RealTimeDashboard;
