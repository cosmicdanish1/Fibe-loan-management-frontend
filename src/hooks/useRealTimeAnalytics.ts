/**
 * REAL-TIME ANALYTICS HOOKS
 * 
 * React hooks for real-time analytics data consumption,
 * user journey tracking, and performance monitoring.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { realTimeAnalytics, RealTimeMetrics, UserJourney, PerformanceInsight } from '../services/realTimeAnalytics';

// Hook for real-time metrics
export const useRealTimeMetrics = () => {
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Initialize real-time analytics
    realTimeAnalytics.initialize();

    // Subscribe to metrics updates
    const unsubscribe = realTimeAnalytics.subscribe('metrics', (data: RealTimeMetrics) => {
      setMetrics(data);
      setLastUpdate(new Date());
    });

    // Check connection status
    const checkConnection = () => {
      setIsConnected(realTimeAnalytics.isConnected());
    };

    checkConnection();
    const connectionInterval = setInterval(checkConnection, 5000);

    // Get initial metrics
    const initialMetrics = realTimeAnalytics.getCurrentMetrics();
    if (initialMetrics) {
      setMetrics(initialMetrics);
    }

    return () => {
      unsubscribe();
      clearInterval(connectionInterval);
    };
  }, []);

  const refreshMetrics = useCallback(() => {
    const currentMetrics = realTimeAnalytics.getCurrentMetrics();
    if (currentMetrics) {
      setMetrics(currentMetrics);
      setLastUpdate(new Date());
    }
  }, []);

  return {
    metrics,
    isConnected,
    lastUpdate,
    refreshMetrics,
  };
};

// Hook for user journey tracking
export const useUserJourney = () => {
  const [currentJourney, setCurrentJourney] = useState<UserJourney | null>(null);
  const [journeyHistory, setJourneyHistory] = useState<UserJourney[]>([]);

  useEffect(() => {
    // Subscribe to user journey updates
    const unsubscribe = realTimeAnalytics.subscribe('user-journey', (journey: UserJourney) => {
      setCurrentJourney(journey);
      
      // Update journey history
      setJourneyHistory(prev => {
        const existing = prev.find(j => j.sessionId === journey.sessionId);
        if (existing) {
          return prev.map(j => j.sessionId === journey.sessionId ? journey : j);
        } else {
          return [journey, ...prev.slice(0, 9)]; // Keep last 10 journeys
        }
      });
    });

    return unsubscribe;
  }, []);

  const trackAction = useCallback((action: string, details?: any) => {
    realTimeAnalytics.trackUserAction(action, details);
  }, []);

  const trackConversion = useCallback((event: string, value?: number) => {
    realTimeAnalytics.trackConversionEvent(event, value);
  }, []);

  return {
    currentJourney,
    journeyHistory,
    trackAction,
    trackConversion,
  };
};

// Hook for performance insights
export const usePerformanceInsights = () => {
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [criticalInsights, setCriticalInsights] = useState<PerformanceInsight[]>([]);

  useEffect(() => {
    // Subscribe to performance insights
    const unsubscribe = realTimeAnalytics.subscribe('performance-insights', (newInsights: PerformanceInsight[]) => {
      setInsights(newInsights);
      setCriticalInsights(newInsights.filter(insight => insight.impact === 'critical' || insight.impact === 'high'));
    });

    // Get initial insights
    const initialInsights = realTimeAnalytics.getPerformanceInsights();
    setInsights(initialInsights);
    setCriticalInsights(initialInsights.filter(insight => insight.impact === 'critical' || insight.impact === 'high'));

    return unsubscribe;
  }, []);

  return {
    insights,
    criticalInsights,
    hasCriticalIssues: criticalInsights.length > 0,
  };
};

// Hook for real-time alerts
export const useRealTimeAlerts = () => {
  const [alerts, setAlerts] = useState<Array<{ id: string; type: string; message: string; timestamp: string; severity: 'low' | 'medium' | 'high' | 'critical' }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const alertIdCounter = useRef(0);

  useEffect(() => {
    // Subscribe to metrics for alerts
    const unsubscribeMetrics = realTimeAnalytics.subscribe('metrics', (metrics: RealTimeMetrics) => {
      const newAlerts = [];

      // Check for performance alerts
      if (metrics.averageResponseTime > 3000) {
        newAlerts.push({
          id: `perf-${++alertIdCounter.current}`,
          type: 'performance',
          message: `Average response time is ${Math.round(metrics.averageResponseTime)}ms (threshold: 3000ms)`,
          timestamp: new Date().toISOString(),
          severity: 'high' as const,
        });
      }

      // Check for error rate alerts
      if (metrics.errorsPerMinute > 5) {
        newAlerts.push({
          id: `error-${++alertIdCounter.current}`,
          type: 'error',
          message: `High error rate: ${metrics.errorsPerMinute} errors per minute`,
          timestamp: new Date().toISOString(),
          severity: 'critical' as const,
        });
      }

      // Add performance alerts from metrics
      metrics.performanceAlerts.forEach(alert => {
        newAlerts.push({
          id: `alert-${++alertIdCounter.current}`,
          type: alert.type,
          message: alert.message,
          timestamp: alert.timestamp,
          severity: 'medium' as const,
        });
      });

      if (newAlerts.length > 0) {
        setAlerts(prev => [...newAlerts, ...prev.slice(0, 19)]); // Keep last 20 alerts
        setUnreadCount(prev => prev + newAlerts.length);
      }
    });

    // Subscribe to performance insights for critical alerts
    const unsubscribeInsights = realTimeAnalytics.subscribe('performance-insights', (insights: PerformanceInsight[]) => {
      const criticalInsights = insights.filter(insight => insight.impact === 'critical');
      
      criticalInsights.forEach(insight => {
        setAlerts(prev => [{
          id: `insight-${++alertIdCounter.current}`,
          type: 'performance',
          message: `Critical performance issue: ${insight.metric} - ${insight.recommendation}`,
          timestamp: new Date().toISOString(),
          severity: 'critical' as const,
        }, ...prev.slice(0, 19)]);
        
        setUnreadCount(prev => prev + 1);
      });
    });

    return () => {
      unsubscribeMetrics();
      unsubscribeInsights();
    };
  }, []);

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
    setUnreadCount(0);
  }, []);

  return {
    alerts,
    unreadCount,
    markAsRead,
    dismissAlert,
    clearAllAlerts,
  };
};

// Hook for conversion tracking
export const useConversionTracking = () => {
  const [conversions, setConversions] = useState<Array<{ sessionId: string; event: string; value?: number; timestamp: string }>>([]);
  const [conversionRate, setConversionRate] = useState(0);

  useEffect(() => {
    // Subscribe to conversion events
    const unsubscribe = realTimeAnalytics.subscribe('conversion', (conversion: { sessionId: string; event: string; value?: number }) => {
      const newConversion = {
        ...conversion,
        timestamp: new Date().toISOString(),
      };
      
      setConversions(prev => [newConversion, ...prev.slice(0, 99)]); // Keep last 100 conversions
    });

    return unsubscribe;
  }, []);

  // Calculate conversion rate (simplified)
  useEffect(() => {
    const metrics = realTimeAnalytics.getCurrentMetrics();
    if (metrics && conversions.length > 0) {
      const rate = (conversions.length / metrics.currentSessions) * 100;
      setConversionRate(Math.min(rate, 100));
    }
  }, [conversions]);

  const trackConversion = useCallback((event: string, value?: number) => {
    realTimeAnalytics.trackConversionEvent(event, value);
  }, []);

  return {
    conversions,
    conversionRate,
    trackConversion,
  };
};

// Hook for A/B testing (basic implementation)
export const useABTesting = (testName: string, variants: string[]) => {
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simple A/B test assignment based on session ID
    const sessionId = realTimeAnalytics.getCurrentMetrics()?.activeUsers || 0;
    const variantIndex = sessionId % variants.length;
    const variant = variants[variantIndex];
    
    setSelectedVariant(variant);
    setIsLoading(false);

    // Track A/B test participation
    realTimeAnalytics.trackUserAction('ab_test_assigned', {
      testName,
      variant,
    });
  }, [testName, variants]);

  const trackConversion = useCallback((conversionEvent: string, value?: number) => {
    realTimeAnalytics.trackConversionEvent(`${testName}_${selectedVariant}_${conversionEvent}`, value);
  }, [testName, selectedVariant]);

  return {
    variant: selectedVariant,
    isLoading,
    trackConversion,
  };
};

// Hook for real-time dashboard data
export const useRealTimeDashboard = () => {
  const metrics = useRealTimeMetrics();
  const journey = useUserJourney();
  const insights = usePerformanceInsights();
  const alerts = useRealTimeAlerts();
  const conversions = useConversionTracking();

  const [dashboardData, setDashboardData] = useState({
    isLoading: true,
    hasError: false,
    lastRefresh: null as Date | null,
  });

  useEffect(() => {
    const hasData = metrics.metrics || journey.currentJourney || insights.insights.length > 0;
    
    setDashboardData({
      isLoading: !hasData,
      hasError: false,
      lastRefresh: new Date(),
    });
  }, [metrics.metrics, journey.currentJourney, insights.insights]);

  const refreshAll = useCallback(() => {
    metrics.refreshMetrics();
    setDashboardData(prev => ({
      ...prev,
      lastRefresh: new Date(),
    }));
  }, [metrics]);

  return {
    metrics: metrics.metrics,
    isConnected: metrics.isConnected,
    currentJourney: journey.currentJourney,
    journeyHistory: journey.journeyHistory,
    insights: insights.insights,
    criticalInsights: insights.criticalInsights,
    alerts: alerts.alerts,
    unreadAlerts: alerts.unreadCount,
    conversions: conversions.conversions,
    conversionRate: conversions.conversionRate,
    dashboardState: dashboardData,
    refreshAll,
    trackAction: journey.trackAction,
    trackConversion: journey.trackConversion,
    markAlertsAsRead: alerts.markAsRead,
    dismissAlert: alerts.dismissAlert,
  };
};
