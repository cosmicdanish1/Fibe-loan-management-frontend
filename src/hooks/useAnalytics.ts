import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsService, FeatureUsageData, ErrorData } from '../services/analyticsService';

// Custom hook for analytics tracking
export const useAnalytics = () => {
  const location = useLocation();
  const pageStartTime = useRef<number>(Date.now());
  const componentName = useRef<string>('');

  // Initialize analytics on mount
  useEffect(() => {
    analyticsService.initialize();
    
    return () => {
      analyticsService.cleanup();
    };
  }, []);

  // Track page visits when location changes
  useEffect(() => {
    const pageName = location.pathname;
    const startTime = Date.now();
    pageStartTime.current = startTime;

    // Track page visit
    analyticsService.trackPageVisit({
      pageName,
      windowTitle: document.title,
      routePath: location.pathname,
      componentName: componentName.current,
      pageLoadTime: startTime - performance.navigationStart,
    });

    // Cleanup function to track page exit
    return () => {
      const duration = Date.now() - pageStartTime.current;
      // Page exit tracking is handled by the analytics service
    };
  }, [location]);

  // Track feature usage
  const trackFeatureUsage = useCallback((data: Omit<FeatureUsageData, 'sessionId'>) => {
    analyticsService.trackFeatureUsage({
      ...data,
      sessionId: analyticsService.getSessionId() || '',
    });
  }, []);

  // Track button clicks
  const trackButtonClick = useCallback((buttonName: string, category: string = 'UI', additionalData?: any) => {
    trackFeatureUsage({
      featureCategory: category,
      featureName: buttonName,
      actionType: 'click',
      actionDetails: additionalData,
      sessionId: '',
    });
  }, [trackFeatureUsage]);

  // Track form submissions
  const trackFormSubmit = useCallback((formName: string, success: boolean, resultCount?: number, errorMessage?: string) => {
    trackFeatureUsage({
      featureCategory: 'Forms',
      featureName: formName,
      actionType: 'submit',
      successStatus: success,
      resultCount,
      errorMessage,
      sessionId: '',
    });
  }, [trackFeatureUsage]);

  // Track report generation
  const trackReportGeneration = useCallback((reportName: string, filters?: any, resultCount?: number, executionTime?: number) => {
    trackFeatureUsage({
      featureCategory: 'Reports',
      featureName: reportName,
      actionType: 'view',
      actionDetails: filters,
      resultCount,
      executionTime,
      successStatus: true,
      sessionId: '',
    });
  }, [trackFeatureUsage]);

  // Track search operations
  const trackSearch = useCallback((searchType: string, query: string, resultCount: number, executionTime?: number) => {
    trackFeatureUsage({
      featureCategory: 'Search',
      featureName: searchType,
      actionType: 'search',
      actionDetails: { query: query.length > 50 ? '[LONG_QUERY]' : query },
      resultCount,
      executionTime,
      successStatus: resultCount >= 0,
      sessionId: '',
    });
  }, [trackFeatureUsage]);

  // Track downloads
  const trackDownload = useCallback((fileName: string, fileType: string, fileSize?: number) => {
    trackFeatureUsage({
      featureCategory: 'Downloads',
      featureName: fileName,
      actionType: 'download',
      actionDetails: { fileType, fileSize },
      successStatus: true,
      sessionId: '',
    });
  }, [trackFeatureUsage]);

  // Track print operations
  const trackPrint = useCallback((documentType: string, pageCount?: number) => {
    trackFeatureUsage({
      featureCategory: 'Print',
      featureName: documentType,
      actionType: 'print',
      actionDetails: { pageCount },
      successStatus: true,
      sessionId: '',
    });
  }, [trackFeatureUsage]);

  // Track errors
  const trackError = useCallback((error: Error, componentName: string, userAction?: string) => {
    const errorData: ErrorData = {
      sessionId: analyticsService.getSessionId() || '',
      errorType: 'javascript',
      severityLevel: 'medium',
      errorMessage: error.message,
      stackTrace: error.stack,
      componentName,
      fileName: extractFileName(error.stack),
      lineNumber: extractLineNumber(error.stack),
      userActionBeforeError: userAction,
    };

    analyticsService.trackError(errorData);
  }, []);

  // Set component name for tracking
  const setComponentName = useCallback((name: string) => {
    componentName.current = name;
  }, []);

  // Check if analytics is enabled
  const isAnalyticsEnabled = useCallback(() => {
    return analyticsService.isEnabled();
  }, []);

  return {
    trackFeatureUsage,
    trackButtonClick,
    trackFormSubmit,
    trackReportGeneration,
    trackSearch,
    trackDownload,
    trackPrint,
    trackError,
    setComponentName,
    isAnalyticsEnabled,
  };
};

// Hook for component-specific analytics
export const useComponentAnalytics = (componentName: string) => {
  const analytics = useAnalytics();
  
  useEffect(() => {
    analytics.setComponentName(componentName);
  }, [analytics, componentName]);

  // Track component mount
  useEffect(() => {
    analytics.trackFeatureUsage({
      featureCategory: 'Components',
      featureName: componentName,
      actionType: 'view',
      sessionId: '',
    });
  }, [analytics, componentName]);

  return analytics;
};

// Hook for performance tracking
export const usePerformanceTracking = (operationName: string) => {
  const startTime = useRef<number>(0);
  const analytics = useAnalytics();

  const startTracking = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const endTracking = useCallback((success: boolean = true, resultCount?: number) => {
    const executionTime = Math.round(performance.now() - startTime.current);
    
    analytics.trackFeatureUsage({
      featureCategory: 'Performance',
      featureName: operationName,
      actionType: 'view',
      executionTime,
      successStatus: success,
      resultCount,
      sessionId: '',
    });
  }, [analytics, operationName]);

  return { startTracking, endTracking };
};

// Utility functions
function extractFileName(stackTrace?: string): string | undefined {
  if (!stackTrace) return undefined;
  
  const match = stackTrace.match(/at .* \((.+):(\d+):(\d+)\)/);
  if (match) {
    const fullPath = match[1];
    return fullPath.split('/').pop() || fullPath;
  }
  
  return undefined;
}

function extractLineNumber(stackTrace?: string): number | undefined {
  if (!stackTrace) return undefined;
  
  const match = stackTrace.match(/at .* \(.+:(\d+):\d+\)/);
  return match ? parseInt(match[1], 10) : undefined;
}
