import { test, expect } from '@playwright/test';
import { _electron as electron } from '@playwright/test';

test.describe('Navbar Component Tests', () => {
  test('should display navbar with menu items', async () => {
    // Launch Electron app
    const electronApp = await electron.launch({
      args: ['.']
    });

    // Get the first window
    const window = await electronApp.firstWindow();
    
    // Wait for the app to be ready
    await window.waitForLoadState('domcontentloaded');

    // Verify the navbar exists
    const navbar = await window.locator('nav').first();
    await expect(navbar).toBeVisible();

    // Check if File menu exists
    const fileMenu = await window.getByText('File');
    await expect(fileMenu).toBeVisible();

    // Check if Administration menu exists
    const adminMenu = await window.getByText('Administration');
    await expect(adminMenu).toBeVisible();

    // Check if Masters menu exists
    const mastersMenu = await window.getByText('Masters');
    await expect(mastersMenu).toBeVisible();

    // Click on File menu to open dropdown
    await fileMenu.click();
    
    // Verify some menu items in the File dropdown
    const saveOption = await window.getByText('Save');
    await expect(saveOption).toBeVisible();
    
    // Close the app
    await electronApp.close();
  });
});