# 🚀 Loan Management System

> Espat Karmchari Co-Operative Credit Society Limited
>
> A comprehensive loan management system built with Electron, React, and TypeScript

A modern desktop application for managing loans, fixed deposits, and member certificates with a beautiful and responsive UI.

## ✨ Features

- **Loan Management** - Comprehensive loan processing and tracking
- **Fixed Deposit Certificates** - Generate and manage FD certificates
- **Share Certificates** - Issue and track share certificates
- **Passbook Management** - Customizable passbook settings
- **Modern UI** - Clean, responsive interface with dark mode support
- **Cross-Platform** - Works on Windows, macOS, and Linux
- **Secure** - Built with security best practices
- **Offline-First** - Works without internet connection

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, SCSS
- **Desktop**: Electron 37
- **Build Tool**: Vite 7
- **Styling**: SCSS with CSS variables
- **Development**: Hot reload, TypeScript compilation

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+ or yarn 1.22+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/loan-management-system.git
   cd loan-management-system
   ```

2. **Install dependencies**
   ```bash
   # Using npm
   npm install
   
   # OR using yarn
   yarn install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Update environment variables as needed

### Development

1. **Start Development Server**
   ```bash
   # Start both React dev server and Electron
   npm run dev
   
   # Or run separately
   npm run dev:react  # Starts Vite dev server
   npm run dev:electron  # Starts Electron in another terminal
   ```

2. **Common Development Commands**
   ```bash
   # Lint code
   npm run lint
   
   # Fix linting issues
   npm run lint:fix
   
   # Run tests
   npm test
   ```

### Testing

The project uses a comprehensive testing strategy with different types of tests:

1. **Unit Tests** - Test individual components and functions
   ```bash
   # Run all unit tests
   npm test
   
   # Run specific tests
   npm test -- -t "Component Name"
   
   # Generate coverage report
   npm run test:coverage
   ```

2. **Integration Tests** - Test component interactions
   ```bash
   # Run all integration tests
   npx playwright test tests/integration
   
   # Run specific integration test
   npx playwright test tests/integration/specific-test.spec.ts
   ```

3. **E2E Tests** - Test complete user flows with Playwright
   ```bash
   # Run all E2E tests
   npx playwright test tests/e2e
   
   # Run specific E2E test
   npx playwright test tests/e2e/specific-test.spec.ts
   ```

Specialized test scripts:
```bash
.\run-navbar-tests.bat      # Run Navbar component tests
.\run-navbar-modal-tests.bat # Run Navbar-Modal integration tests
```

For more details on testing, refer to:
- [TESTING_STRATEGY.md](./docs/TESTING_STRATEGY.md) - Comprehensive testing documentation
- [tests/README.md](./tests/README.md) - Test directory structure and guidelines

### Production Build

1. **Create Production Build**
   ```bash
   # Build React app and Electron
   npm run build
   
   # Package the application
   npm run package
   ```

2. **Run Production Build**
   ```bash
   # On Windows
   .\dist\win-unpacked\loan-management-system.exe
   
   # On macOS
   open /path/to/loan-management-system.app
   
   # On Linux
   ./dist/linux-unpacked/loan-management-system
   ```

## 🚀 Development

### Start Development Server
```bash
npm run dev
```

This will:
- Start Vite dev server on port 5173
- Launch Electron app
- Enable hot reload for both React and Electron

### Build for Production
```bash
npm run build
```

This will:
- Build React app with Vite
- Compile TypeScript for Electron
- Output to `dist/` directory

### Preview Production Build
```bash
npm run preview
```

## 📁 Project Structure

```
loan-management-system/
├── src/
│   ├── assets/               # Static assets (images, fonts, etc.)
│   ├── backend/              # Backend services and API
│   │   ├── api/              # API endpoints
│   │   ├── models/           # Database models
│   │   └── services/         # Business logic
│   │
│   ├── components/           # Reusable UI components
│   │   ├── common/           # Common components (buttons, inputs, etc.)
│   │   └── layout/           # Layout components
│   │
│   ├── features/             # Feature modules
│   │   ├── Administration/   # Admin features
│   │   │   ├── CertificateSettingAndPrinting/
│   │   │   │   ├── FixedDepositCertificatePrinting/
│   │   │   │   ├── PassbookParameterSetting/
│   │   │   │   └── ShareCertificatePrinting/
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── hooks/                # Custom React hooks
│   ├── styles/               # Global styles and themes
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions
│   ├── App.tsx               # Root component
│   └── main.tsx              # Application entry point
│
├── public/                   # Static files
├── .github/                  # GitHub configurations
├── .vscode/                  # VS Code settings
├── dist/                     # Production build output
├── electron/                 # Electron main process
│   ├── main.ts               # Main process
│   └── preload.ts            # Preload scripts
│
├── .env.example              # Environment variables example
├── .eslintrc.js              # ESLint configuration
├── .gitignore                # Git ignore file
├── package.json              # Project dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── tsconfig.electron.json    # Electron TypeScript config
└── vite.config.ts            # Vite configuration
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_APP_NAME="Loan Management System"
VITE_APP_VERSION=1.0.0
VITE_API_BASE_URL=http://localhost:3000/api
```

### Development Tools

- **VS Code Extensions** (recommended):
  - ESLint
  - Prettier
  - TypeScript Vue Plugin (Volar)
  - Tailwind CSS IntelliSense

- **Debugging**
  - Use VS Code's built-in debugger
  - Chrome DevTools for renderer process
  - VS Code debugger for main process
- Build output to `dist/renderer`
- Development server on port 5173

### TypeScript Configuration
- Strict mode enabled
- React JSX support
- Separate configs for main and renderer processes

### SCSS Variables
- Comprehensive color palette
- Typography scale
- Spacing system
- Shadow and transition presets
- Responsive breakpoints

## 🎨 Styling

The app uses a modern design system with:

- **Color Palette**: Primary, secondary, and accent colors
- **Typography**: Inter font family with consistent sizing
- **Spacing**: 8-point grid system
- **Shadows**: Multiple shadow levels for depth
- **Transitions**: Smooth animations and hover effects
- **Responsive**: Mobile-first design approach
- **Dark Mode**: Automatic theme switching

## 🔒 Security Features

- **Context Isolation**: Prevents direct access to Node.js APIs
- **Preload Script**: Secure API exposure to renderer
- **External Link Protection**: Opens external links safely
- **Window Creation Prevention**: Blocks unauthorized windows

## 📱 IPC Communication

The app demonstrates secure communication between main and renderer processes:

```typescript
// Send message to main process
window.electronAPI.sendMessage('Hello from renderer!')

// Receive message from main process
window.electronAPI.onMessage((message) => {
  console.log('Message from main:', message)
})

// Get app version
const version = await window.electronAPI.getAppVersion()
```

## 🚀 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run dev:vite` - Start Vite dev server only
- `npm run dev:electron` - Start Electron only
- `npm run build:vite` - Build React app only
- `npm run build:electron` - Build Electron only

## 🔧 Development Tips

1. **Hot Reload**: Both React and Electron support hot reloading
2. **TypeScript**: Full type safety for both processes
3. **SCSS**: Use variables from `variables.scss` for consistency
4. **IPC**: Add new APIs in `preload.ts` and handle in `main.ts`
5. **Styling**: Follow the established design system

## 📦 Building for Distribution

To create distributable packages:

```bash
# Install electron-builder
npm install -D electron-builder

# Build and package
npm run electron:dist
```

## 🧪 Testing Instructions

### 🔹 Clone the Repository
```bash
git clone <your-repo-url>
cd your-electron-project
```

### 🔹 Switch to Testing Branch
Fetch all branches and move to the **testing** branch:
```bash
git fetch --all
git checkout testing
```

Verify you are on the correct branch:
```bash
git branch
```
You should see:
```
* testing
  main
```

### 🔹 Install Dependencies
Run the following command to install dependencies:
```bash
npm install
```
(or `yarn install` if the project uses yarn)

### 🔹 Run the Project
Start the Electron app:
```bash
npm start
```

### 🔹 Make Changes
1. Modify code as needed.  
2. Save changes.  
3. Stage and commit:
   ```bash
   git add .
   git commit -m "Your message about the change"
   ```

### 🔹 Push Changes to Testing Branch
Push your changes to the remote `testing` branch:
```bash
git push origin testing
```

### ⚠️ Golden Rules
- ❌ **Do NOT push to `main` branch.**  
- ✅ Always use the **`testing`** branch for changes.  
- ✅ Keep commit messages clear and meaningful.  
- ✅ Run `npm start` to ensure the app builds before pushing.

## 🛠 Troubleshooting

### Common Issues

1. **Dependency Installation Issues**
   - Delete `node_modules` and `package-lock.json`
   - Run `npm cache clean --force`
   - Reinstall with `npm install`

2. **Build Failures**
   - Ensure all TypeScript errors are resolved
   - Check for missing dependencies
   - Verify environment variables

3. **Runtime Errors**
   - Check developer tools for errors (Ctrl+Shift+I)
   - Verify database connection if applicable
   - Ensure all environment variables are set

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- Electron team for the amazing desktop framework
- React team for the modern UI library
- Vite team for the fast build tool
- TypeScript team for type safety

---

Built with ❤️ using Electron, React, TypeScript & SCSS
