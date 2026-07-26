import { test, expect } from '@playwright/test';

test.describe('Loan Application Rendering Stress', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Login API to bypass backend requirement
        await page.route('**/api/**/login', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    token: 'mock-jwt-token',
                    user: { id: 1, username: 'admin', role: 'admin' }
                })
            });
        });

        // Mock other potential auth checks
        await page.route('**/api/**/me', async route => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({ id: 1, username: 'admin', role: 'admin' })
            });
        });

        // Use HashRouter format for navigation
        await page.goto('/#/login');
        await page.getByLabel('Username').fill('admin');
        await page.getByLabel('Password').fill('SuperAdmin@2025');
        await page.getByRole('button', { name: /Sign In/i }).click();

        // Wait for navigation to dashboard (handling potential redirects)
        await expect(page).toHaveURL(/dashboard|home/i);

        // Navigate to component under test
        await page.goto('/#/loan-application');
        console.log('Navigated to Loan Application');
    });

    test('Should handle adding 50 Nominee rows without freezing', async ({ page }) => {
        test.setTimeout(120000); // Allow 2 mins
        await page.goto('/#/loan-application');
        console.log('Navigated to Loan Application');

        await page.getByRole('button', { name: /Nominee Details/i }).click();
        console.log('Clicked Nominee Tab');

        const addButton = page.getByRole('button', { name: /Add New Row/i });

        // Wait for button to be attached
        await addButton.waitFor({ state: 'attached' });

        const start = Date.now();
        for (let i = 0; i < 50; i++) {
            await addButton.click({ force: true });
        }
        const end = Date.now();

        console.log(`Added 50 Nominee rows in ${end - start}ms`);
        // Relaxed budget for CI/Dev environments where 50 clicks might take time
        expect(end - start).toBeLessThan(20000);

        // Check if 50 rows exist (checking index 50 exists in the first column)
        await expect(page.getByText('50', { exact: true }).first()).toBeVisible();
    });

    test('Should handle adding 50 FDR rows without freezing', async ({ page }) => {
        test.setTimeout(60000);
        await page.getByRole('button', { name: /Loan Against Deposit/i }).click();
        const addButton = page.getByRole('button', { name: /Add New Row/i });

        const start = Date.now();
        for (let i = 0; i < 50; i++) {
            await addButton.click();
        }
        const end = Date.now();
        console.log(`Added 50 FDR rows in ${end - start}ms`);
        expect(end - start).toBeLessThan(20000);
    });
});
