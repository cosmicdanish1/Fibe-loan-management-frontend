/// <reference types="vite/client" />

// Pulls in Vite's ambient declarations for asset imports (*.png, *.svg, *.css,
// …). Without this, `import logo from './logo.png'` is a type error even though
// Vite bundles it correctly — which is why the asset imports in SplashScreen
// and LoginForm previously reported TS2307.
