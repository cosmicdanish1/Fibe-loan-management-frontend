import { test, expect } from '@playwright/test';
import { _electron as electron } from '@playwright/test';

test.describe('Form Submission Integration Tests', () => {
  test('should validate and submit a form with multiple components', async () => {
    // Launch Electron app
    const electronApp = await electron.launch({
      args: ['.']
    });

    // Get the first window
    const window = await electronApp.firstWindow();
    
    // Wait for the app to be ready
    await window.waitForLoadState('domcontentloaded');

    // Navigate to the form page
    const formsLink = await window.getByText('Forms');
    await formsLink.click();
    
    // Verify form page is loaded
    const formPage = await window.locator('[data-testid="customer-form-page"]');
    await expect(formPage).toBeVisible();
    
    // Fill out form fields across multiple components
    // Personal information component
    await window.locator('input[name="firstName"]').fill('John');
    await window.locator('input[name="lastName"]').fill('Doe');
    await window.locator('input[name="email"]').fill('invalid-email'); // Invalid email format
    
    // Try to proceed to next section
    const nextButton = await window.getByText('Next');
    await nextButton.click();
    
    // Verify validation error appears
    const emailError = await window.locator('[data-testid="email-error"]');
    await expect(emailError).toBeVisible();
    await expect(emailError).toHaveText('Please enter a valid email address');
    
    // Fix the email and proceed
    await window.locator('input[name="email"]').fill('john.doe@example.com');
    await nextButton.click();
    
    // Address component should now be visible
    const addressSection = await window.locator('[data-testid="address-section"]');
    await expect(addressSection).toBeVisible();
    
    // Fill address fields
    await window.locator('input[name="street"]').fill('123 Main St');
    await window.locator('input[name="city"]').fill('Anytown');
    await window.locator('select[name="state"]').selectOption('CA');
    await window.locator('input[name="zipCode"]').fill('12345');
    
    // Proceed to payment section
    await nextButton.click();
    
    // Payment component should now be visible
    const paymentSection = await window.locator('[data-testid="payment-section"]');
    await expect(paymentSection).toBeVisible();
    
    // Fill payment information
    await window.locator('input[name="cardNumber"]').fill('4111111111111111');
    await window.locator('input[name="cardName"]').fill('John Doe');
    await window.locator('input[name="expiryDate"]').fill('12/25');
    await window.locator('input[name="cvv"]').fill('123');
    
    // Submit the form
    const submitButton = await window.getByText('Submit');
    await submitButton.click();
    
    // Verify success message appears
    const successMessage = await window.locator('[data-testid="success-message"]');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText('Form submitted successfully');
    
    // Verify form data was processed correctly
    // This could check a summary component that displays all submitted information
    const summary = await window.locator('[data-testid="submission-summary"]');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('John Doe');
    await expect(summary).toContainText('john.doe@example.com');
    await expect(summary).toContainText('123 Main St');
    
    // Close the app
    await electronApp.close();
  });
  
  test('should handle form submission errors gracefully', async () => {
    // Launch Electron app
    const electronApp = await electron.launch({
      args: ['.']
    });

    // Get the first window
    const window = await electronApp.firstWindow();
    
    // Wait for the app to be ready
    await window.waitForLoadState('domcontentloaded');

    // Navigate to the form page
    const formsLink = await window.getByText('Forms');
    await formsLink.click();
    
    // Fill out all form sections with valid data
    // Personal information
    await window.locator('input[name="firstName"]').fill('Jane');
    await window.locator('input[name="lastName"]').fill('Smith');
    await window.locator('input[name="email"]').fill('jane.smith@example.com');
    
    // Proceed to address
    const nextButton = await window.getByText('Next');
    await nextButton.click();
    
    // Address information
    await window.locator('input[name="street"]').fill('456 Oak Ave');
    await window.locator('input[name="city"]').fill('Somewhere');
    await window.locator('select[name="state"]').selectOption('NY');
    await window.locator('input[name="zipCode"]').fill('54321');
    
    // Proceed to payment
    await nextButton.click();
    
    // Payment information - use a card number that will trigger a server error
    await window.locator('input[name="cardNumber"]').fill('4000000000000002'); // This number causes a test error
    await window.locator('input[name="cardName"]').fill('Jane Smith');
    await window.locator('input[name="expiryDate"]').fill('10/24');
    await window.locator('input[name="cvv"]').fill('456');
    
    // Submit the form
    const submitButton = await window.getByText('Submit');
    await submitButton.click();
    
    // Verify error message appears
    const errorMessage = await window.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Payment processing failed');
    
    // Verify we can try again
    const tryAgainButton = await window.getByText('Try Again');
    await expect(tryAgainButton).toBeVisible();
    
    // Verify form data is still preserved
    await expect(window.locator('input[name="cardName"]')).toHaveValue('Jane Smith');
    
    // Close the app
    await electronApp.close();
  });
});