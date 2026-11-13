import React from 'react';
import ReactDOM from 'react-dom/client';
// antd 5 + React 19: without this patch the static message.* / notification.* / Modal.* helpers render
// NOTHING (React 19 removed ReactDOM.render), so every toast in the app was silently invisible.
import '@ant-design/v5-patch-for-react-19';
import { StyleProvider } from '@ant-design/cssinjs';
import './input.css';
import '../styles/antd.css';

// Suppress Ant Design React 19 compatibility warnings temporarily
import '../utils/suppressAntdWarnings';

// Initialize global error handlers (logs to file)
import { initGlobalErrorHandlers } from '../services/globalErrorHandlers';
initGlobalErrorHandlers();

// Easter egg: signature in the DevTools console
import { printKovaSignature } from '../utils/kovaSignature';
printKovaSignature();

// Animation settings (Settings > Animations): applied to <html> before the first screen is drawn.
import { initMotion } from '../config/motion';
initMotion();

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
import { languageReady } from '../i18n';

// The saved language is loaded first, then the app code is imported, so text
// kept in module-level constants (menus, table headers) is already translated
// when it is created.
void languageReady.then(async () => {
  const { default: App } = await import('./App');
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
  );
});
