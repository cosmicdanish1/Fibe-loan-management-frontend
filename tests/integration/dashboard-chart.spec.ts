import { test, expect } from '@playwright/test';
import { _electron as electron } from '@playwright/test';

test.describe('Dashboard and Chart Integration Tests', () => {
  test('should load dashboard with charts and respond to date filter changes', async () => {
    // Launch Electron app
    const electronApp = await electron.launch({
      args: ['.']
    });

    // Get the first window
    const window = await electronApp.firstWindow();
    
    // Wait for the app to be ready
    await window.waitForLoadState('domcontentloaded');

    // Navigate to Dashboard if not already there
    const dashboardLink = await window.getByText('Dashboard');
    await dashboardLink.click();
    
    // Verify dashboard page is loaded
    const dashboardPage = await window.locator('[data-testid="dashboard-page"]');
    await expect(dashboardPage).toBeVisible();
    
    // Verify charts are visible
    const salesChart = await window.locator('[data-testid="sales-chart"]');
    await expect(salesChart).toBeVisible();
    
    // Get initial chart data
    const initialChartData = await salesChart.evaluate((el) => {
      // This assumes the chart has a data property accessible via DOM
      // Actual implementation may vary based on chart library
      return el.__chartData || {};
    });
    
    // Change date filter
    const dateFilter = await window.locator('[data-testid="date-filter"]');
    await dateFilter.click();
    
    // Select last month option
    const lastMonthOption = await window.getByText('Last Month');
    await lastMonthOption.click();
    
    // Wait for chart to update
    await window.waitForTimeout(1000); // Wait for any animations or data loading
    
    // Verify chart data has changed
    const updatedChartData = await salesChart.evaluate((el) => {
      return el.__chartData || {};
    });
    
    // Verify data is different after filter change
    expect(updatedChartData).not.toEqual(initialChartData);
    
    // Test interaction with chart
    // Click on a specific data point
    const dataPoint = await salesChart.locator('.data-point').first();
    await dataPoint.click();
    
    // Verify detail popup appears
    const detailPopup = await window.locator('.chart-detail-popup');
    await expect(detailPopup).toBeVisible();
    
    // Verify popup contains expected data
    await expect(detailPopup).toContainText('Sales Details');
    
    // Close the app
    await electronApp.close();
  });
  
  test('should filter dashboard data and update multiple charts', async () => {
    // Launch Electron app
    const electronApp = await electron.launch({
      args: ['.']
    });

    // Get the first window
    const window = await electronApp.firstWindow();
    
    // Wait for the app to be ready
    await window.waitForLoadState('domcontentloaded');

    // Navigate to Dashboard
    const dashboardLink = await window.getByText('Dashboard');
    await dashboardLink.click();
    
    // Verify multiple charts are visible
    const salesChart = await window.locator('[data-testid="sales-chart"]');
    const inventoryChart = await window.locator('[data-testid="inventory-chart"]');
    
    await expect(salesChart).toBeVisible();
    await expect(inventoryChart).toBeVisible();
    
    // Open category filter
    const categoryFilter = await window.locator('[data-testid="category-filter"]');
    await categoryFilter.click();
    
    // Select a specific category
    const electronicsCategory = await window.getByText('Electronics');
    await electronicsCategory.click();
    
    // Wait for charts to update
    await window.waitForTimeout(1000);
    
    // Verify both charts have updated with filtered data
    // This could be checking for specific elements or data attributes that indicate filtering
    const salesChartTitle = await salesChart.locator('.chart-title');
    await expect(salesChartTitle).toContainText('Electronics Sales');
    
    const inventoryChartTitle = await inventoryChart.locator('.chart-title');
    await expect(inventoryChartTitle).toContainText('Electronics Inventory');
    
    // Verify filter indicator is shown
    const activeFilters = await window.locator('[data-testid="active-filters"]');
    await expect(activeFilters).toContainText('Electronics');
    
    // Clear filters
    const clearFiltersButton = await window.locator('[data-testid="clear-filters"]');
    await clearFiltersButton.click();
    
    // Verify charts return to unfiltered state
    await expect(salesChartTitle).toContainText('Sales');
    await expect(inventoryChartTitle).toContainText('Inventory');
    
    // Close the app
    await electronApp.close();
  });
});