const { spawn } = require('child_process');
const axios = require('axios');

async function testPort(port) {
  try {
    await axios.get(`http://localhost:${port}`, { timeout: 1000 });
    return false; // Port is in use
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return true; // Port is free
    }
    return false; // Port might be in use
  }
}

async function findFreePort() {
  const portsToTry = [3001, 3002, 3003, 5000, 8000];
  
  for (const port of portsToTry) {
    console.log(`Checking if port ${port} is free...`);
    const isFree = await testPort(port);
    if (isFree) {
      console.log(`✅ Port ${port} is available`);
      return port;
    } else {
      console.log(`❌ Port ${port} is in use`);
    }
  }
  
  return null;
}

async function startBackend() {
  console.log('🔍 Finding free port for backend...\n');
  
  const freePort = await findFreePort();
  
  if (!freePort) {
    console.log('❌ No free ports found. Please manually stop processes using ports 3000-3003, 5000, 8000');
    return;
  }
  
  console.log(`\n🚀 Starting backend on port ${freePort}...`);
  console.log('📝 You can update your test scripts to use this port\n');
  
  // Set environment variable for the port
  process.env.PORT = freePort.toString();
  
  // Start the backend
  const backend = spawn('npm', ['run', 'start:dev'], {
    cwd: './backend',
    env: { ...process.env, PORT: freePort.toString() },
    stdio: 'inherit'
  });
  
  backend.on('error', (error) => {
    console.error('❌ Failed to start backend:', error);
  });
  
  backend.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
  
  // Wait a bit and test if backend started
  setTimeout(async () => {
    try {
      const response = await axios.get(`http://localhost:${freePort}/api/v1/health`, { timeout: 5000 });
      console.log(`\n✅ Backend is running on port ${freePort}!`);
      console.log(`🌐 API Base URL: http://localhost:${freePort}`);
      console.log(`📚 Swagger Docs: http://localhost:${freePort}/api/docs`);
      
      // Update test scripts
      console.log(`\n📝 Update your test scripts with:`);
      console.log(`const BASE_URL = 'http://localhost:${freePort}';`);
      
    } catch (error) {
      console.log(`\n⚠️  Backend might still be starting up on port ${freePort}...`);
      console.log('Wait a moment and try your tests again.');
    }
  }, 10000);
}

startBackend();