import { apiService } from './api';

// Analytics configuration interface
export interface AnalyticsConfig {
  enabled: boolean;
  trackingLevel: 'minimal' | 'standard' | 'detailed' | 'debug';
  anonymizeUserData: boolean;
  excludeSensitiveData: boolean;
}

// Session data interface
export interface SessionData {
  sessionId: string;
  userId?: number;
  username?: string;
  deviceType: string;
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  screenResolution: string;
  timezone: string;
  appVersion: string;
}

// Page visit data interface
export interface PageVisitData {
  sessionId: string;
  pageName: string;
  windowTitle: string;
  routePath: string;
  componentName?: string;
  pageLoadTime?: number;
  referrerPage?: string;
}

// Feature usage data interface
export interface FeatureUsageData {
  sessionId: string;
  featureCategory: string;
  featureName: string;
  subFeature?: string;
  actionType: 'view' | 'click' | 'submit' | 'download' | 'print' | 'search' | 'filter';
  actionDetails?: any;
  executionTime?: number;
  successStatus?: boolean;
  errorMessage?: string;
  resultCount?: number;
}

// Error data interface
export interface ErrorData {
  sessionId: string;
  errorType: 'javascript' | 'api' | 'validation' | 'network' | 'render';
  severityLevel: 'low' | 'medium' | 'high' | 'critical';
  errorMessage: string;
  errorCode?: string;
  stackTrace?: string;
  componentName?: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
  userActionBeforeError?: string;
  networkStatus?: string;
}

class AnalyticsService {
  private config: AnalyticsConfig = {
    enabled: false,
    trackingLevel: 'standard',
    anonymizeUserData: true,
    excludeSensitiveData: true,
  };

  private sessionId: string | null = null;
  private currentPage: string | null = null;
  private pageStartTime: number | null = null;
  private eventQueue: any[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // Initialize analytics service
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load configuration from backend
      // await this.loadConfiguration();

      if (this.config.enabled) {
        // Generate session ID
        this.sessionId = this.generateSessionId();

        // Start session tracking
        await this.startSession();

        // Set up page unload handler
        this.setupUnloadHandler();

        // Start flush timer
        this.startFlushTimer();

        console.log('📊 Analytics service initialized', { sessionId: this.sessionId });
      }

      this.isInitialized = true;
    } catch (error) {
      console.warn('⚠️ Analytics initialization failed:', error);
      this.config.enabled = false;
    }
  }

  // Load configuration from backend
  private async loadConfiguration(): Promise<void> {
    try {
      const response = await apiService.request('/analytics/config');
      if (response.success && response.data) {
        const configMap = new Map(response.data.map((item: any) => [item.config_key, item.config_value]));

        this.config = {
          enabled: configMap.get('analytics_enabled') === 'true',
          trackingLevel: configMap.get('tracking_level') || 'standard',
          anonymizeUserData: configMap.get('anonymize_user_data') === 'true',
          excludeSensitiveData: configMap.get('exclude_sensitive_data') === 'true',
        };
      }
    } catch (error) {
      console.warn('Failed to load analytics configuration:', error);
    }
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get device and browser information
  private getDeviceInfo(): Partial<SessionData> {
    const userAgent = navigator.userAgent;
    const screen = window.screen;

    // Simple browser detection
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';

    if (userAgent.includes('Chrome')) {
      browserName = 'Chrome';
      const match = userAgent.match(/Chrome\/([0-9.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      const match = userAgent.match(/Firefox\/([0-9.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Safari')) {
      browserName = 'Safari';
      const match = userAgent.match(/Version\/([0-9.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Edge')) {
      browserName = 'Edge';
      const match = userAgent.match(/Edge\/([0-9.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }

    // Simple OS detection
    let osName = 'Unknown';
    let osVersion = 'Unknown';

    if (userAgent.includes('Windows NT')) {
      osName = 'Windows';
      const match = userAgent.match(/Windows NT ([0-9.]+)/);
      osVersion = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Mac OS X')) {
      osName = 'macOS';
      const match = userAgent.match(/Mac OS X ([0-9_]+)/);
      osVersion = match ? match[1].replace(/_/g, '.') : 'Unknown';
    } else if (userAgent.includes('Linux')) {
      osName = 'Linux';
    }

    return {
      deviceType: 'desktop', // Could be enhanced to detect mobile/tablet
      browserName,
      browserVersion,
      osName,
      osVersion,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      appVersion: '1.0.0', // Could be read from package.json or environment
    };
  }

  // Start session tracking
  private async startSession(): Promise<void> {
    if (!this.config.enabled || !this.sessionId) return;

    try {
      const deviceInfo = this.getDeviceInfo();
      const sessionData: SessionData = {
        sessionId: this.sessionId,
        ...deviceInfo,
      } as SessionData;

      // Add user info if available (from auth context)
      const userInfo = this.getCurrentUserInfo();
      if (userInfo) {
        sessionData.userId = userInfo.userId;
        sessionData.username = this.config.anonymizeUserData ? this.anonymizeUsername(userInfo.username) : userInfo.username;
      }

      await this.queueEvent('session/start', sessionData);
    } catch (error) {
      console.warn('Failed to start session tracking:', error);
    }
  }

  // End session tracking
  async endSession(): Promise<void> {
    if (!this.config.enabled || !this.sessionId) return;

    try {
      await this.queueEvent('session/end', {
        sessionId: this.sessionId,
        logoutTime: new Date().toISOString(),
      });

      // Flush remaining events
      await this.flushEvents();
    } catch (error) {
      console.warn('Failed to end session tracking:', error);
    }
  }

  // Track page visit
  async trackPageVisit(pageData: Partial<PageVisitData>): Promise<void> {
    if (!this.config.enabled || !this.sessionId) return;
    if (this.config.trackingLevel === 'minimal') return;

    try {
      // End previous page visit if exists
      if (this.currentPage && this.pageStartTime) {
        await this.endPageVisit();
      }

      // Start new page visit
      this.currentPage = pageData.pageName || window.location.pathname;
      this.pageStartTime = Date.now();

      const visitData: PageVisitData = {
        sessionId: this.sessionId,
        pageName: this.currentPage,
        windowTitle: document.title,
        routePath: window.location.pathname,
        componentName: pageData.componentName,
        pageLoadTime: pageData.pageLoadTime,
        referrerPage: document.referrer || undefined,
        ...pageData,
      };

      await this.queueEvent('page/visit', visitData);
    } catch (error) {
      console.warn('Failed to track page visit:', error);
    }
  }

  // End page visit
  private async endPageVisit(): Promise<void> {
    if (!this.currentPage || !this.pageStartTime) return;

    try {
      const duration = Math.round((Date.now() - this.pageStartTime) / 1000);

      await this.queueEvent('page/end', {
        sessionId: this.sessionId,
        pageName: this.currentPage,
        durationSeconds: duration,
        isBounce: duration < 5, // Consider < 5 seconds as bounce
      });
    } catch (error) {
      console.warn('Failed to end page visit:', error);
    }
  }

  // Track feature usage
  async trackFeatureUsage(featureData: FeatureUsageData): Promise<void> {
    if (!this.config.enabled || !this.sessionId) return;
    if (this.config.trackingLevel === 'minimal') return;

    try {
      const usageData = {
        ...featureData,
        sessionId: this.sessionId,
      };

      // Anonymize sensitive data if needed
      if (this.config.excludeSensitiveData && usageData.actionDetails) {
        usageData.actionDetails = this.sanitizeActionDetails(usageData.actionDetails);
      }

      await this.queueEvent('feature/usage', usageData);
    } catch (error) {
      console.warn('Failed to track feature usage:', error);
    }
  }

  // Track error
  async trackError(errorData: ErrorData): Promise<void> {
    // Always track errors regardless of analytics settings
    if (!this.sessionId) {
      this.sessionId = this.generateSessionId();
    }

    try {
      const errorInfo = {
        ...errorData,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
      };

      // Send error immediately (don't queue)
      await this.sendEvent('error/track', errorInfo);
    } catch (error) {
      console.error('Failed to track error:', error);
    }
  }

  // Queue event for batch processing
  private async queueEvent(endpoint: string, data: any): Promise<void> {
    this.eventQueue.push({
      endpoint,
      data,
      timestamp: Date.now(),
    });

    // Flush if queue is getting full
    if (this.eventQueue.length >= 50) {
      await this.flushEvents();
    }
  }

  // Send event immediately
  private async sendEvent(endpoint: string, data: any): Promise<void> {
    try {
      await apiService.request(`/analytics/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.warn(`Failed to send analytics event to ${endpoint}:`, error);
    }
  }

  // Flush queued events
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Send events in parallel
      const promises = eventsToFlush.map(event =>
        this.sendEvent(event.endpoint, event.data)
      );

      await Promise.allSettled(promises);
    } catch (error) {
      console.warn('Failed to flush analytics events:', error);
      // Re-queue failed events
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  // Start flush timer
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, 30000); // Flush every 30 seconds
  }

  // Setup page unload handler
  private setupUnloadHandler(): void {
    const handleUnload = () => {
      if (this.currentPage && this.pageStartTime) {
        // Use sendBeacon for reliable delivery on page unload
        const duration = Math.round((Date.now() - this.pageStartTime) / 1000);
        const data = JSON.stringify({
          sessionId: this.sessionId,
          pageName: this.currentPage,
          durationSeconds: duration,
        });

        navigator.sendBeacon('/api/v1/analytics/page/end', data);
      }

      // End session
      if (this.sessionId) {
        const sessionData = JSON.stringify({
          sessionId: this.sessionId,
          logoutTime: new Date().toISOString(),
        });

        navigator.sendBeacon('/api/v1/analytics/session/end', sessionData);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
  }

  // Get current user info (to be implemented based on auth context)
  private getCurrentUserInfo(): { userId: number; username: string } | null {
    // This should integrate with your auth context
    // For now, return null
    return null;
  }

  // Anonymize username
  private anonymizeUsername(username: string): string {
    if (username.length <= 3) return '***';
    return username.substring(0, 2) + '*'.repeat(username.length - 2);
  }

  // Sanitize action details to remove sensitive data
  private sanitizeActionDetails(details: any): any {
    if (!details || typeof details !== 'object') return details;

    const sanitized = { ...details };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'pin', 'ssn', 'account'];

    const sanitizeObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitizeObject(value);
          }
        }
        return result;
      }

      return obj;
    };

    return sanitizeObject(sanitized);
  }

  // Public methods for external use
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public getSessionId(): string | null {
    return this.sessionId;
  }

  public getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  // Cleanup
  public cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    this.flushEvents();
  }

  // API methods for dashboard/analytics components
  public async getAllUsers(query: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<{ success: boolean; data: any[] }> {
    try {
      const response = await apiService.request('/analytics/users', {
        method: 'GET',
        params: query,
      });
      return response;
    } catch (error) {
      console.error('Failed to get all users analytics:', error);
      return { success: false, data: [] };
    }
  }

  public async getStatus(): Promise<{ success: boolean; data: any }> {
    try {
      const response = await apiService.request('/analytics/status');
      return response;
    } catch (error) {
      console.error('Failed to get analytics status:', error);
      return { success: false, data: {} };
    }
  }

  public async getUserAnalytics(query: {
    username?: string;
    user_id?: number;
    member_number?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    data_type?: string;
  }): Promise<{ success: boolean; data: any }> {
    try {
      const response = await apiService.request('/analytics/user', {
        method: 'GET',
        params: query,
      });
      return response;
    } catch (error) {
      console.error('Failed to get user analytics:', error);
      return { success: false, data: null };
    }
  }

  public async exportUserAnalytics(query: {
    username?: string;
    user_id?: number;
    member_number?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ success: boolean; data: any }> {
    try {
      const response = await apiService.request('/analytics/user/export', {
        method: 'GET',
        params: query,
      });
      return response;
    } catch (error) {
      console.error('Failed to export user analytics:', error);
      return { success: false, data: null };
    }
  }

  public async getPerformanceMetrics(query: {
    start_date?: string;
    end_date?: string;
    metric_type?: string;
  }): Promise<{ success: boolean; data: any }> {
    try {
      const response = await apiService.request('/analytics/performance', {
        method: 'GET',
        params: query,
      });
      return response;
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return { success: false, data: [] };
    }
  }

  public async getErrorAnalytics(query: {
    start_date?: string;
    end_date?: string;
    severity_level?: string;
    error_type?: string;
    resolved_status?: boolean;
    limit?: number;
  }): Promise<{ success: boolean; data: any }> {
    try {
      const response = await apiService.request('/analytics/errors', {
        method: 'GET',
        params: query,
      });
      return response;
    } catch (error) {
      console.error('Failed to get error analytics:', error);
      return { success: false, data: [] };
    }
  }

  public async getSystemHealth(): Promise<{ success: boolean; data: any }> {
    try {
      const response = await apiService.request('/analytics/system/health');
      return response;
    } catch (error) {
      console.error('Failed to get system health:', error);
      return { success: false, data: {} };
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// Export types
export type {
  AnalyticsConfig,
  SessionData,
  PageVisitData,
  FeatureUsageData,
  ErrorData,
};
