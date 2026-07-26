import { test, expect } from '@playwright/test';

test.describe('Loan Application Stress Test', () => {
    test('should render loan application repeatedly without performance degradation', async ({ page }) => {
        const iterations = 50;
        const renderTimes: number[] = [];

        await page.goto('/');

        for (let i = 0; i < iterations; i++) {
            const start = Date.now();

            // Open Loan Application
            await page.getByRole('button', { name: 'Loan Application' }).click();
            await expect(page.getByText('Loan Details')).toBeVisible();

            // Close (Cancel)
            await page.getByRole('button', { name: 'Cancel' }).click();

            const end = Date.now();
            renderTimes.push(end - start);
        }

        // Calculate average render time
        const avgTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
        console.log(`Average Render Time over ${iterations} iterations: ${avgTime}ms`);

        expect(avgTime).toBeLessThan(1000); // Expect sub-second transitions
    });
});
