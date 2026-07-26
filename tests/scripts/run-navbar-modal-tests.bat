@echo off
pushd ..\..
echo Running Navbar-Modal Integration Tests...

:: Run the Playwright integration test for navbar-modal
npx playwright test tests/integration/navbar-modal.spec.ts

echo Tests completed.
popd
pause