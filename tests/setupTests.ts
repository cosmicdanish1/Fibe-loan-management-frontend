// tests/setupTests.ts
import '@testing-library/jest-dom';

// ES-70: antd-heavy screens render slowly on CI/cold runs; default 5s caused flaky timeouts.
import { vi } from 'vitest';
vi.setConfig({ testTimeout: 15000 });
