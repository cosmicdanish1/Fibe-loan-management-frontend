import { test, expect } from '@playwright/test';

test.describe('Loan Application Performance & Stress', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each performance test to ensure we are accessing the active application
        await page.goto('/login');
        await page.getByLabel('Username').fill('admin');
        await page.getByLabel('Password').fill('SuperAdmin@2025');
        await page.getByRole('button', { name: /Sign In/i }).click();
        await expect(page).toHaveURL(/dashboard|home/i);
    });

    test('Page Load Performance', async ({ page }) => {
        const startTime = Date.now();
        await page.goto('/loan-application');
        const loadTime = Date.now() - startTime;

        console.log(`Loan Application Page Load Time: ${loadTime}ms`);

        // Performance budget: Fail if it takes more than 10 seconds to load (relaxed for Dev/CI)
        expect(loadTime).toBeLessThan(10000);
    });

    test('Tab Switching Performance', async ({ page }) => {
        await page.goto('/loan-application');

        const tabs = ['Nominee Details', 'Loan Against Deposit', 'Loan Details'];

        for (const tab of tabs) {
            const start = Date.now();
            await page.getByRole('button', { name: tab }).click();
            const end = Date.now() - start;
            console.log(`Switch to ${tab} took: ${end}ms`);

            // Switching should be reasonably fast (under 1s for Dev/CI)
            expect(end).toBeLessThan(1000);
        }
    });

    test('Input Responsiveness under "Stress"', async ({ page }) => {
        await page.goto('/loan-application');

        // Simulate rapid typing in a field
        const input = page.locator('input[name="reason"]').first();
        if (await input.isVisible()) {
            const start = Date.now();
            await input.fill('Stress testing input responsiveness'.repeat(10));
            const end = Date.now() - start;
            console.log(`Bulk input fill took: ${end}ms`);

            expect(end).toBeLessThan(1000);
        }
    });
});
