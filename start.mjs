import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get port from environment or use default
const port = process.env.PORT || 3002;

// Log startup information
console.log('🚀 Starting Absensi PKP Server');
console.log(`📍 Port: ${port}`);
console.log(`🌐 URL: http://localhost:${port}`);
console.log('');

// Execute Next.js start command with the specified port
try {
  execSync(`npx next start -p ${port}`, {
    stdio: 'inherit',
    env: { ...process.env, PORT: port }
  });
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
}
