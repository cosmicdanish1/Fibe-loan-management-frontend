/**
 * ANALYTICS MONITORING SERVICE
 * 
 * Advanced monitoring, alerting, and optimization features
 * for production analytics system (Phase 4).
 */

import { analyticsService } from './analyticsService';
import { realTimeAnalytics } from './realTimeAnalytics';

export interface MonitoringConfig {
  enabled: boolean;
  alertThresholds: {
    errorRate: number;
    responseTime: number;
    memoryUsage: number;
    diskUsage: number;
    sessionTimeout: number;
  };
  notifications: {
    email: boolean;
    browser: boolean;
    webhook: boolean;
  };
  healthChecks: {
    interval: number;
    timeout: number;
    retries: number;
  };
  performance: {
    enableProfiling: boolean;
    sampleRate: number;
    maxTraceSize: number;
  };
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical' | 'down';
  uptime: number;
  lastCheck: string;
  services: {
    database: 'up' | 'down' | 'slow';
    api: 'up' | 'down' | 'slow';
    websocket: 'up' | 'down' | 'slow';
    storage: 'up' | 'down' | 'slow';
  };
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  alerts: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
}

export interface PerformanceProfile {
  timestamp: string;
  operation: string;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  stackTrace?: string;
  metadata?: any;
}

class AnalyticsMonitoringService {
  private config: MonitoringConfig = {
    enabled: false,
    alertThresholds: {
      errorRate: 5, // errors per minute
      responseTime: 3000, // milliseconds
      memoryUsage: 80, // percentage
      diskUsage: 85, // percentage
      sessionTimeout: 1800, // seconds (30 minutes)
    },
    notifications: {
      email: false,
      browser: true,
      webhook: false,
    },
    healthChecks: {
      interval: 30000, // 30 seconds
      timeout: 5000, // 5 seconds
      retries: 3,
    },
    performance: {
      enableProfiling: false,
      sampleRate: 0.1, // 10% sampling
      maxTraceSize: 1000,
    },
  };

  private healthCheckInterval: NodeJS.Timeout | null = null;
  private performanceProfiles: PerformanceProfile[] = [];
  private systemHealth: SystemHealth = {
    status: 'healthy',
    uptime: 0,
    lastCheck: new Date().toISOString(),
    services: {
      database: 'up',
      api: 'up',
      websocket: 'up',
      storage: 'up',
    },
    metrics: {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0,
    },
    alerts: [],
  };

  private startTime = Date.now();
  private alertHistory: Array<any> = [];

  // Initialize monitoring service
  async initialize(): Promise<void> {
    if (!analyticsService.isEnabled()) {
      console.log('📊 Analytics monitoring disabled - main analytics is disabled');
      return;
    }

    try {
      await this.loadConfiguration();
      
      if (this.config.enabled) {
        this.startHealthChecks();
        this.startPerformanceMonitoring();
        this.setupBrowserNotifications();
        console.log('📊 Analytics monitoring service initialized');
      }
    } catch (error) {
      console.warn('⚠️ Analytics monitoring initialization failed:', error);
    }
  }

  // Load monitoring configuration
  private async loadConfiguration(): Promise<void> {
    try {
      // In a real implementation, load from backend
      // For now, use default configuration
      this.config.enabled = true;
      console.log('📊 Monitoring configuration loaded');
    } catch (error) {
      console.warn('Failed to load monitoring configuration:', error);
    }
  }

  // Start health checks
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthChecks.interval);

    // Initial health check
    this.performHealthCheck();
  }

  // Perform comprehensive health check
  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Update uptime
      this.systemHealth.uptime = Date.now() - this.startTime;
      this.systemHealth.lastCheck = new Date().toISOString();

      // Check services
      await this.checkServices();
      
      // Check system metrics
      await this.checkSystemMetrics();
      
      // Evaluate overall health
      this.evaluateSystemHealth();
      
      // Check for alerts
      this.checkAlertConditions();
      
      console.log(`📊 Health check completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('Health check failed:', error);
      this.systemHealth.status = 'critical';
      this.addAlert('critical', 'Health check system failure', error);
    }
  }

  // Check individual services
  private async checkServices(): Promise<void> {
    // Check database connectivity
    try {
      // Simulate database check
      const dbStart = Date.now();
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      const dbTime = Date.now() - dbStart;
      
      this.systemHealth.services.database = dbTime > 1000 ? 'slow' : 'up';
    } catch (error) {
      this.systemHealth.services.database = 'down';
      this.addAlert('high', 'Database connectivity issue', error);
    }

    // Check API endpoints
    try {
      const apiStart = Date.now();
      // In real implementation, ping health endpoint
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
      const apiTime = Date.now() - apiStart;
      
      this.systemHealth.services.api = apiTime > 2000 ? 'slow' : 'up';
    } catch (error) {
      this.systemHealth.services.api = 'down';
      this.addAlert('high', 'API service unavailable', error);
    }

    // Check WebSocket connection
    this.systemHealth.services.websocket = realTimeAnalytics.isConnected() ? 'up' : 'down';
    
    // Check storage
    this.systemHealth.services.storage = 'up'; // Simplified for demo
  }

  // Check system metrics
  private async checkSystemMetrics(): Promise<void> {
    // Memory usage
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      this.systemHealth.metrics.memory = (usedMB / limitMB) * 100;
    } else {
      this.systemHealth.metrics.memory = Math.random() * 60 + 20; // Mock data
    }

    // CPU usage (simulated)
    this.systemHealth.metrics.cpu = Math.random() * 50 + 10;
    
    // Disk usage (simulated)
    this.systemHealth.metrics.disk = Math.random() * 40 + 30;
    
    // Network usage (simulated)
    this.systemHealth.metrics.network = Math.random() * 30 + 5;
  }

  // Evaluate overall system health
  private evaluateSystemHealth(): void {
    const services = Object.values(this.systemHealth.services);
    const downServices = services.filter(s => s === 'down').length;
    const slowServices = services.filter(s => s === 'slow').length;
    
    const criticalMetrics = [
      this.systemHealth.metrics.memory > this.config.alertThresholds.memoryUsage,
      this.systemHealth.metrics.disk > this.config.alertThresholds.diskUsage,
    ].filter(Boolean).length;

    if (downServices > 0 || criticalMetrics > 1) {
      this.systemHealth.status = 'critical';
    } else if (slowServices > 1 || criticalMetrics > 0) {
      this.systemHealth.status = 'warning';
    } else if (slowServices > 0) {
      this.systemHealth.status = 'warning';
    } else {
      this.systemHealth.status = 'healthy';
    }
  }

  // Check alert conditions
  private checkAlertConditions(): void {
    const metrics = realTimeAnalytics.getCurrentMetrics();
    
    if (metrics) {
      // Error rate alert
      if (metrics.errorsPerMinute > this.config.alertThresholds.errorRate) {
        this.addAlert('high', `High error rate: ${metrics.errorsPerMinute} errors/min`);
      }
      
      // Response time alert
      if (metrics.averageResponseTime > this.config.alertThresholds.responseTime) {
        this.addAlert('medium', `Slow response time: ${Math.round(metrics.averageResponseTime)}ms`);
      }
    }

    // Memory usage alert
    if (this.systemHealth.metrics.memory > this.config.alertThresholds.memoryUsage) {
      this.addAlert('high', `High memory usage: ${Math.round(this.systemHealth.metrics.memory)}%`);
    }

    // Disk usage alert
    if (this.systemHealth.metrics.disk > this.config.alertThresholds.diskUsage) {
      this.addAlert('critical', `High disk usage: ${Math.round(this.systemHealth.metrics.disk)}%`);
    }
  }

  // Add alert
  private addAlert(severity: 'low' | 'medium' | 'high' | 'critical', message: string, error?: any): void {
    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity,
      message,
      timestamp: new Date().toISOString(),
      resolved: false,
      error: error?.message || undefined,
    };

    this.systemHealth.alerts.unshift(alert);
    this.alertHistory.unshift(alert);
    
    // Keep only last 50 alerts
    if (this.systemHealth.alerts.length > 50) {
      this.systemHealth.alerts = this.systemHealth.alerts.slice(0, 50);
    }

    // Send notification
    this.sendNotification(alert);
    
    console.warn(`📊 Alert [${severity.toUpperCase()}]: ${message}`);
  }

  // Send notification
  private sendNotification(alert: any): void {
    if (this.config.notifications.browser && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`Analytics Alert - ${alert.severity.toUpperCase()}`, {
          body: alert.message,
          icon: '/favicon.ico',
          tag: alert.id,
        });
      }
    }
  }

  // Setup browser notifications
  private setupBrowserNotifications(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log(`📊 Notification permission: ${permission}`);
        });
      }
    }
  }

  // Start performance monitoring
  private startPerformanceMonitoring(): void {
    if (!this.config.performance.enableProfiling) return;

    // Monitor long tasks
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.addPerformanceProfile({
              timestamp: new Date().toISOString(),
              operation: 'long-task',
              duration: entry.duration,
              memoryBefore: 0,
              memoryAfter: 0,
              metadata: {
                name: entry.name,
                startTime: entry.startTime,
              },
            });
          }
        }
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Long task monitoring not supported:', error);
      }
    }
  }

  // Add performance profile
  private addPerformanceProfile(profile: PerformanceProfile): void {
    if (Math.random() > this.config.performance.sampleRate) return;

    this.performanceProfiles.unshift(profile);
    
    // Keep only recent profiles
    if (this.performanceProfiles.length > this.config.performance.maxTraceSize) {
      this.performanceProfiles = this.performanceProfiles.slice(0, this.config.performance.maxTraceSize);
    }
  }

  // Profile function execution
  profileFunction<T>(name: string, fn: () => T): T {
    if (!this.config.performance.enableProfiling) return fn();

    const startTime = performance.now();
    const memoryBefore = this.getMemoryUsage();
    
    try {
      const result = fn();
      
      const duration = performance.now() - startTime;
      const memoryAfter = this.getMemoryUsage();
      
      this.addPerformanceProfile({
        timestamp: new Date().toISOString(),
        operation: name,
        duration,
        memoryBefore,
        memoryAfter,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.addPerformanceProfile({
        timestamp: new Date().toISOString(),
        operation: name,
        duration,
        memoryBefore,
        memoryAfter: this.getMemoryUsage(),
        metadata: { error: error.message },
      });
      
      throw error;
    }
  }

  // Get memory usage
  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      return (window as any).performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  // Get system health
  getSystemHealth(): SystemHealth {
    return { ...this.systemHealth };
  }

  // Get performance profiles
  getPerformanceProfiles(): PerformanceProfile[] {
    return [...this.performanceProfiles];
  }

  // Get alert history
  getAlertHistory(): Array<any> {
    return [...this.alertHistory];
  }

  // Resolve alert
  resolveAlert(alertId: string): void {
    const alert = this.systemHealth.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
    
    const historyAlert = this.alertHistory.find(a => a.id === alertId);
    if (historyAlert) {
      historyAlert.resolved = true;
    }
  }

  // Update configuration
  updateConfiguration(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart services if needed
    if (newConfig.enabled !== undefined) {
      if (newConfig.enabled && !this.healthCheckInterval) {
        this.startHealthChecks();
      } else if (!newConfig.enabled && this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
    }
  }

  // Get configuration
  getConfiguration(): MonitoringConfig {
    return { ...this.config };
  }

  // Cleanup
  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.performanceProfiles = [];
    this.alertHistory = [];
    
    console.log('📊 Analytics monitoring service cleaned up');
  }
}

// Export singleton instance
export const analyticsMonitoring = new AnalyticsMonitoringService();

// Export types
export type {
  MonitoringConfig,
  SystemHealth,
  PerformanceProfile,
};
