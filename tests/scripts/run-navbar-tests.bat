@echo off
pushd ..\..
echo Running Navbar Component Tests

echo Running Playwright E2E Tests...
npx playwright test tests/e2e/navbar.spec.ts

echo Running Jest Unit Tests...
npm test -- -t "Navbar Component"

echo Tests completed!
popd
pause