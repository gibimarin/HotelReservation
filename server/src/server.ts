import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';

const startServer = async () => {
  // 1. Establish database connection before accepting traffic
  console.log('[Bootstrap] Initializing database connection...');
  await connectDB();

  // 2. Initialize Express application
  const app = createApp();

  // 3. Start listening on configured port
  const server = app.listen(env.PORT, () => {
    console.log(`🚀 [Server] Hotel Reservation API is running on http://localhost:${env.PORT}`);
    console.log(`🩺 [Server] Health-check available at http://localhost:${env.PORT}/api/health`);
    console.log(`🌍 [Server] Environment: ${env.NODE_ENV}`);
  });

  // 4. Graceful shutdown handler
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
      console.log('🚪 [Server] HTTP server closed.');
      await disconnectDB();
      console.log('🏁 [Server] Graceful shutdown complete. Exiting.');
      process.exit(0);
    });

    // Force shutdown if cleanup takes longer than 10s
    setTimeout(() => {
      console.error('⚠️ [Server] Forced shutdown: Cleanup timed out after 10s.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Catch unexpected unhandled promise rejections
  process.on('unhandledRejection', (reason: Error) => {
    console.error('💥 Unhandled Promise Rejection:', reason);
  });
};

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

