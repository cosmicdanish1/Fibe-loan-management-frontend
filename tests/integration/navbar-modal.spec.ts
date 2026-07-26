import { test, expect } from '@playwright/test';
import { _electron as electron } from '@playwright/test';

test.describe('Navigation and Modal Integration Tests', () => {
  test('should open settings modal from navbar', async () => {
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

    // Click on Settings menu
    const settingsMenu = await window.getByText('Settings');
    await expect(settingsMenu).toBeVisible();
    await settingsMenu.click();
    
    // Verify that the settings modal appears
    const settingsModal = await window.locator('.settings-modal');
    await expect(settingsModal).toBeVisible();
    
    // Verify modal title
    const modalTitle = await settingsModal.locator('h2').first();
    await expect(modalTitle).toHaveText('Settings');
    
    // Test interaction with modal - toggle a setting
    const darkModeToggle = await settingsModal.getByText('Dark Mode');
    await darkModeToggle.click();
    
    // Verify the toggle changed state
    const toggleButton = await darkModeToggle.locator('input[type="checkbox"]');
    await expect(toggleButton).toBeChecked();
    
    // Close the modal
    const closeButton = await settingsModal.locator('button.close-button');
    await closeButton.click();
    
    // Verify modal is closed
    await expect(settingsModal).not.toBeVisible();
    
    // Close the app
    await electronApp.close();
  });
  
  test('should open user profile modal and update settings', async () => {
    // Launch Electron app
    const electronApp = await electron.launch({
      args: ['.']
    });

    // Get the first window
    const window = await electronApp.firstWindow();
    
    // Wait for the app to be ready
    await window.waitForLoadState('domcontentloaded');

    // Click on user profile icon in navbar
    const userProfileIcon = await window.locator('.user-profile-icon');
    await expect(userProfileIcon).toBeVisible();
    await userProfileIcon.click();
    
    // Verify that the user profile modal appears
    const profileModal = await window.locator('.profile-modal');
    await expect(profileModal).toBeVisible();
    
    // Change user display name
    const displayNameInput = await profileModal.locator('input[name="displayName"]');
    await displayNameInput.clear();
    await displayNameInput.fill('Test User');
    
    // Save changes
    const saveButton = await profileModal.getByText('Save Changes');
    await saveButton.click();
    
    // Verify success message
    const successMessage = await window.locator('.toast-success');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText('Profile updated successfully');
    
    // Verify modal closed after save
    await expect(profileModal).not.toBeVisible();
    
    // Verify username updated in navbar
    const usernameDisplay = await window.locator('.username-display');
    await expect(usernameDisplay).toHaveText('Test User');
    
    // Close the app
    await electronApp.close();
  });
});