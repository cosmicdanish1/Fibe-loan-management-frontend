# Stress Tests

This directory contains stress and performance tests for the application.

## Purpose

Stress tests evaluate how the application performs under heavy load or extreme conditions. They help identify performance bottlenecks and ensure the application remains stable under pressure.

## Test Types

- Load tests
- Performance benchmarks
- Memory usage tests
- CPU usage tests

## Example Test

```typescript
// Sample stress test for data loading
import { test, expect } from '@playwright/test';

test.describe('Data Loading Performance', () => {
  test('should handle loading large datasets efficiently', async ({ page }) => {
    // Start performance measurement
    await page.goto('/');
    
    const performanceTiming = await page.evaluate(() => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 1000
      }));
      
      const start = performance.now();
      
      // Simulate loading large dataset into application
      window.dispatchEvent(new CustomEvent('load-data', { detail: largeDataset }));
      
      const end = performance.now();
      return end - start;
    });
    
    // Verify performance is within acceptable limits
    expect(performanceTiming).toBeLessThan(1000); // Should process in less than 1 second
    
    // Verify UI remains responsive
    await expect(page.locator('button')).toBeEnabled();
  });
});
```