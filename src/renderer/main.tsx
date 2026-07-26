import React from 'react';
import ReactDOM from 'react-dom/client';
import { StyleProvider } from '@ant-design/cssinjs';
import App from './App';
import './input.css';
import '../styles/antd.css';

// Suppress Ant Design React 19 compatibility warnings temporarily
import '../utils/suppressAntdWarnings';

// Initialize global error handlers (logs to file)
import { initGlobalErrorHandlers } from '../services/globalErrorHandlers';
initGlobalErrorHandlers();

// Initialize analytics service
import { analyticsService } from '../services/analyticsService';
import { realTimeAnalytics } from '../services/realTimeAnalytics';
import { analyticsMonitoring } from '../services/analyticsMonitoring';

// Initialize analytics when the app starts
analyticsService.initialize().catch(error => {
  console.warn('Analytics initialization failed:', error);
});

// Initialize real-time analytics
realTimeAnalytics.initialize().catch(error => {
  console.warn('Real-time analytics initialization failed:', error);
});

// Initialize monitoring
analyticsMonitoring.initialize().catch(error => {
  console.warn('Analytics monitoring initialization failed:', error);
});

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../store';
import { Spin } from 'antd';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate
        loading={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Spin size="large" />
          </div>
        }
        persistor={persistor}
      >
        <StyleProvider hashPriority="high">
          <App />
        </StyleProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>
)
