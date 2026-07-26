/**
 * Route Consistency Validator
 * 
 * This script validates that all routes are properly configured across:
 * - routes.ts (source of truth)
 * - Navbar.tsx (menu items)
 * - main.ts (Electron window configs)
 * - App.tsx (React Router routes)
 * 
 * Run with: npm run validate-routes
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

class RouteValidator {
    private routesFilePath = path.join(__dirname, '../src/config/routes.ts');
    private navbarFilePath = path.join(__dirname, '../src/components/navigation/Navbar.tsx');
    private mainFilePath = path.join(__dirname, '../src/main/main.ts');
    private appFilePath = path.join(__dirname, '../src/renderer/App.tsx');

    private definedRoutes: Set<string> = new Set();
    private navbarRoutes: Set<string> = new Set();
    private mainRoutes: Set<string> = new Set();
    private appRoutes: Set<string> = new Set();

    async validate(): Promise<ValidationResult> {
        const result: ValidationResult = {
            valid: true,
            errors: [],
            warnings: []
        };

        console.log('🔍 Validating route consistency...\n');

        // Step 1: Extract routes from routes.ts
        this.extractDefinedRoutes();
        console.log(`✓ Found ${this.definedRoutes.size} routes defined in routes.ts`);

        // Step 2: Extract routes from Navbar.tsx
        this.extractNavbarRoutes();
        console.log(`✓ Found ${this.navbarRoutes.size} routes in Navbar.tsx`);

        // Step 3: Extract routes from main.ts
        this.extractMainRoutes();
        console.log(`✓ Found ${this.mainRoutes.size} routes in main.ts`);

        // Step 4: Extract routes from App.tsx
        this.extractAppRoutes();
        console.log(`✓ Found ${this.appRoutes.size} routes in App.tsx\n`);

        // Step 5: Check for inconsistencies
        this.checkNavbarConsistency(result);
        this.checkMainConsistency(result);
        this.checkAppConsistency(result);
        this.checkUnusedRoutes(result);

        // Step 6: Report results
        this.reportResults(result);

        return result;
    }

    private extractDefinedRoutes(): void {
        const content = fs.readFileSync(this.routesFilePath, 'utf-8');
        const routePattern = /['"]([\/][a-z0-9\/-]+)['"]/g;
        let match;

        while ((match = routePattern.exec(content)) !== null) {
            this.definedRoutes.add(match[1]);
        }
    }

    private extractNavbarRoutes(): void {
        const content = fs.readFileSync(this.navbarFilePath, 'utf-8');

        // Look for route: 'xxx' or route: ROUTES.XXX patterns
        const routePattern = /route:\s*['"]([\/][a-z0-9\/-]+)['"]/g;
        let match;

        while ((match = routePattern.exec(content)) !== null) {
            this.navbarRoutes.add(match[1]);
        }
    }

    private extractMainRoutes(): void {
        const content = fs.readFileSync(this.mainFilePath, 'utf-8');

        // Look for routes in WINDOW_CONFIGS
        const routePattern = /['"]([\/][a-z0-9\/-]+)['"]\s*:\s*\{/g;
        let match;

        while ((match = routePattern.exec(content)) !== null) {
            this.mainRoutes.add(match[1]);
        }
    }

    private extractAppRoutes(): void {
        const content = fs.readFileSync(this.appFilePath, 'utf-8');

        // Look for <Route path="xxx" patterns
        const routePattern = /path=["']([\/][a-z0-9\/-]+)["']/g;
        let match;

        while ((match = routePattern.exec(content)) !== null) {
            // Skip special routes like /login, /dashboard, /, *
            if (match[1] !== '/' && match[1] !== '*' && !match[1].includes(':')) {
                this.appRoutes.add(match[1]);
            }
        }
    }

    private checkNavbarConsistency(result: ValidationResult): void {
        for (const route of this.navbarRoutes) {
            if (!this.definedRoutes.has(route)) {
                result.valid = false;
                result.errors.push(
                    `❌ Navbar.tsx uses route "${route}" which is not defined in routes.ts`
                );
            }
        }
    }

    private checkMainConsistency(result: ValidationResult): void {
        for (const route of this.mainRoutes) {
            if (!this.definedRoutes.has(route)) {
                result.valid = false;
                result.errors.push(
                    `❌ main.ts uses route "${route}" which is not defined in routes.ts`
                );
            }
        }
    }

    private checkAppConsistency(result: ValidationResult): void {
        for (const route of this.appRoutes) {
            if (!this.definedRoutes.has(route)) {
                result.valid = false;
                result.errors.push(
                    `❌ App.tsx uses route "${route}" which is not defined in routes.ts`
                );
            }
        }
    }

    private checkUnusedRoutes(result: ValidationResult): void {
        const usedRoutes = new Set([
            ...this.navbarRoutes,
            ...this.mainRoutes,
            ...this.appRoutes
        ]);

        for (const route of this.definedRoutes) {
            if (!usedRoutes.has(route)) {
                result.warnings.push(
                    `⚠️  Route "${route}" is defined in routes.ts but not used anywhere`
                );
            }
        }
    }

    private reportResults(result: ValidationResult): void {
        console.log('\n' + '='.repeat(60));
        console.log('VALIDATION RESULTS');
        console.log('='.repeat(60) + '\n');

        if (result.errors.length === 0 && result.warnings.length === 0) {
            console.log('✅ All routes are consistent! No issues found.\n');
            return;
        }

        if (result.errors.length > 0) {
            console.log('ERRORS:\n');
            result.errors.forEach(error => console.log(error));
            console.log('');
        }

        if (result.warnings.length > 0) {
            console.log('WARNINGS:\n');
            result.warnings.forEach(warning => console.log(warning));
            console.log('');
        }

        console.log('='.repeat(60) + '\n');

        if (!result.valid) {
            console.log('❌ Validation FAILED. Please fix the errors above.\n');
            console.log('💡 TIP: All routes should be defined in src/config/routes.ts');
            console.log('   and imported using the ROUTES constant.\n');
        } else {
            console.log('✅ Validation PASSED (with warnings).\n');
        }
    }
}

// Run validation
const validator = new RouteValidator();
validator.validate().then(result => {
    process.exit(result.valid ? 0 : 1);
}).catch(error => {
    console.error('❌ Validation failed with error:', error);
    process.exit(1);
});
