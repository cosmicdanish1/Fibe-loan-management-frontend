/**
 * REAL-TIME ANALYTICS SERVICE
 * 
 * Provides real-time analytics data collection, streaming updates,
 * and advanced analytics features for Phase 3 implementation.
 */

import { analyticsService } from './analyticsService';

export interface RealTimeMetrics {
  activeUsers: number;
  currentSessions: number;
  pageViews: number;
  errorsPerMinute: number;
  averageResponseTime: number;
  topActivePages: Array<{ page: string; activeUsers: number }>;
  recentErrors: Array<{ timestamp: string; error: string; severity: string }>;
  performanceAlerts: Array<{ type: string; message: string; timestamp: string }>;
}

export interface UserJourney {
  sessionId: string;
  userId?: number;
  startTime: string;
  currentPage: string;
  pageSequence: Array<{
    page: string;
    timestamp: string;
    duration: number;
    actions: Array<{ action: string; timestamp: string; details?: any }>;
  }>;
  totalDuration: number;
  bounceRate: boolean;
  conversionEvents: Array<{ event: string; timestamp: string; value?: number }>;
}

export interface PerformanceInsight {
  metric: string;
  currentValue: number;
  threshold: number;
  trend: 'improving' | 'degrading' | 'stable';
  recommendation: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
}

class RealTimeAnalyticsService {
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private connected = false;
  private subscribers: Map<string, Array<(data: any) => void>> = new Map();
  private metricsCache: RealTimeMetrics | null = null;
  private userJourneyCache: Map<string, UserJourney> = new Map();
  private performanceInsights: PerformanceInsight[] = [];

  // Initialize real-time connection
  async initialize(): Promise<void> {
    if (!analyticsService.isEnabled()) {
      console.log('📊 Real-time analytics disabled - main analytics is disabled');
      return;
    }

    try {
      await this.connectWebSocket();
      this.startPerformanceMonitoring();
      this.startUserJourneyTracking();
      console.log('📊 Real-time analytics service initialized');
    } catch (error) {
      console.warn('⚠️ Real-time analytics initialization failed:', error);
    }
  }

  // Connect to WebSocket for real-time updates
  private async connectWebSocket(): Promise<void> {
    try {
      // In a real implementation, this would connect to your WebSocket server
      // For now, we'll simulate the connection
      console.log('🔌 Connecting to real-time analytics WebSocket...');
      
      // Simulate WebSocket connection
      this.simulateWebSocketConnection();
      
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  // Simulate WebSocket connection for demo purposes
  private simulateWebSocketConnection(): void {
    this.connected = true;
    this.reconnectAttempts = 0;
    
    // Simulate real-time data updates
    setInterval(() => {
      if (this.connected) {
        this.generateMockRealTimeData();
      }
    }, 5000); // Update every 5 seconds

    console.log('✅ Real-time analytics WebSocket connected (simulated)');
  }

  // Generate mock real-time data for demonstration
  private generateMockRealTimeData(): void {
    const mockMetrics: RealTimeMetrics = {
      activeUsers: Math.floor(Math.random() * 50) + 10,
      currentSessions: Math.floor(Math.random() * 30) + 5,
      pageViews: Math.floor(Math.random() * 100) + 50,
      errorsPerMinute: Math.floor(Math.random() * 5),
      averageResponseTime: Math.random() * 2000 + 500,
      topActivePages: [
        { page: '/reports/member-ledger', activeUsers: Math.floor(Math.random() * 15) + 5 },
        { page: '/masters/member', activeUsers: Math.floor(Math.random() * 12) + 3 },
        { page: '/transaction/loan-payment', activeUsers: Math.floor(Math.random() * 10) + 2 },
        { page: '/reports/cash-book', activeUsers: Math.floor(Math.random() * 8) + 1 },
      ],
      recentErrors: this.generateMockErrors(),
      performanceAlerts: this.generateMockAlerts(),
    };

    this.metricsCache = mockMetrics;
    this.notifySubscribers('metrics', mockMetrics);
  }

  // Generate mock error data
  private generateMockErrors(): Array<{ timestamp: string; error: string; severity: string }> {
    const errors = [
      'API timeout on member lookup',
      'Validation failed for loan amount',
      'Database connection slow',
      'Report generation timeout',
      'Member data not found',
    ];

    const severities = ['low', 'medium', 'high'];
    const mockErrors = [];

    for (let i = 0; i < Math.floor(Math.random() * 3); i++) {
      mockErrors.push({
        timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(),
        error: errors[Math.floor(Math.random() * errors.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
      });
    }

    return mockErrors;
  }

  // Generate mock performance alerts
  private generateMockAlerts(): Array<{ type: string; message: string; timestamp: string }> {
    const alerts = [];
    
    if (Math.random() > 0.7) {
      alerts.push({
        type: 'performance',
        message: 'Member lookup response time above threshold (>2s)',
        timestamp: new Date().toISOString(),
      });
    }

    if (Math.random() > 0.8) {
      alerts.push({
        type: 'error',
        message: 'Error rate increased by 50% in last 5 minutes',
        timestamp: new Date().toISOString(),
      });
    }

    return alerts;
  }

  // Schedule WebSocket reconnection
  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.connectWebSocket();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    } else {
      console.error('❌ Max reconnection attempts reached. Real-time analytics disabled.');
    }
  }

  // Subscribe to real-time updates
  subscribe(event: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    
    this.subscribers.get(event)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Notify subscribers of updates
  private notifySubscribers(event: string, data: any): void {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in real-time analytics callback:', error);
        }
      });
    }
  }

  // Start performance monitoring
  private startPerformanceMonitoring(): void {
    // Monitor page load times
    if (typeof window !== 'undefined' && window.performance) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.trackPerformanceEntry(entry);
        }
      });

      observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
    }

    // Monitor memory usage
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Check every 30 seconds
  }

  // Track performance entries
  private trackPerformanceEntry(entry: PerformanceEntry): void {
    if (entry.entryType === 'navigation') {
      const navEntry = entry as PerformanceNavigationTiming;
      const loadTime = navEntry.loadEventEnd - navEntry.navigationStart;
      
      if (loadTime > 3000) { // Alert if page load > 3 seconds
        this.addPerformanceInsight({
          metric: 'Page Load Time',
          currentValue: loadTime,
          threshold: 3000,
          trend: 'degrading',
          recommendation: 'Optimize page resources and reduce bundle size',
          impact: 'medium',
        });
      }
    }
  }

  // Check memory usage
  private checkMemoryUsage(): void {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      const usagePercent = (usedMB / limitMB) * 100;

      if (usagePercent > 80) {
        this.addPerformanceInsight({
          metric: 'Memory Usage',
          currentValue: usagePercent,
          threshold: 80,
          trend: 'degrading',
          recommendation: 'Check for memory leaks and optimize component cleanup',
          impact: 'high',
        });
      }
    }
  }

  // Add performance insight
  private addPerformanceInsight(insight: PerformanceInsight): void {
    this.performanceInsights.unshift(insight);
    
    // Keep only last 10 insights
    if (this.performanceInsights.length > 10) {
      this.performanceInsights = this.performanceInsights.slice(0, 10);
    }

    this.notifySubscribers('performance-insights', this.performanceInsights);
  }

  // Start user journey tracking
  private startUserJourneyTracking(): void {
    // Track page navigation for user journeys
    if (typeof window !== 'undefined') {
      let currentJourney: UserJourney | null = null;

      // Listen for page changes
      const trackPageChange = () => {
        const sessionId = analyticsService.getSessionId();
        if (!sessionId) return;

        if (!currentJourney) {
          currentJourney = {
            sessionId,
            startTime: new Date().toISOString(),
            currentPage: window.location.pathname,
            pageSequence: [],
            totalDuration: 0,
            bounceRate: false,
            conversionEvents: [],
          };
        }

        const now = new Date().toISOString();
        const lastPage = currentJourney.pageSequence[currentJourney.pageSequence.length - 1];
        
        if (lastPage) {
          lastPage.duration = Date.now() - new Date(lastPage.timestamp).getTime();
        }

        currentJourney.pageSequence.push({
          page: window.location.pathname,
          timestamp: now,
          duration: 0,
          actions: [],
        });

        currentJourney.currentPage = window.location.pathname;
        this.userJourneyCache.set(sessionId, currentJourney);
        this.notifySubscribers('user-journey', currentJourney);
      };

      // Track initial page
      trackPageChange();

      // Track page changes (for SPA)
      let lastUrl = window.location.href;
      setInterval(() => {
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          trackPageChange();
        }
      }, 1000);
    }
  }

  // Track conversion event
  trackConversionEvent(event: string, value?: number): void {
    const sessionId = analyticsService.getSessionId();
    if (!sessionId) return;

    const journey = this.userJourneyCache.get(sessionId);
    if (journey) {
      journey.conversionEvents.push({
        event,
        timestamp: new Date().toISOString(),
        value,
      });

      this.userJourneyCache.set(sessionId, journey);
      this.notifySubscribers('conversion', { sessionId, event, value });
    }
  }

  // Track user action within current page
  trackUserAction(action: string, details?: any): void {
    const sessionId = analyticsService.getSessionId();
    if (!sessionId) return;

    const journey = this.userJourneyCache.get(sessionId);
    if (journey && journey.pageSequence.length > 0) {
      const currentPage = journey.pageSequence[journey.pageSequence.length - 1];
      currentPage.actions.push({
        action,
        timestamp: new Date().toISOString(),
        details,
      });

      this.userJourneyCache.set(sessionId, journey);
    }
  }

  // Get current real-time metrics
  getCurrentMetrics(): RealTimeMetrics | null {
    return this.metricsCache;
  }

  // Get user journey for session
  getUserJourney(sessionId: string): UserJourney | null {
    return this.userJourneyCache.get(sessionId) || null;
  }

  // Get performance insights
  getPerformanceInsights(): PerformanceInsight[] {
    return [...this.performanceInsights];
  }

  // Check connection status
  isConnected(): boolean {
    return this.connected;
  }

  // Disconnect and cleanup
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.connected = false;
    this.subscribers.clear();
    this.userJourneyCache.clear();
    this.performanceInsights = [];
    
    console.log('📊 Real-time analytics service disconnected');
  }
}

// Export singleton instance
export const realTimeAnalytics = new RealTimeAnalyticsService();

// Export types
export type {
  RealTimeMetrics,
  UserJourney,
  PerformanceInsight,
};
