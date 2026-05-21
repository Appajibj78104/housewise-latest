// Boots an ephemeral in-memory MongoDB and starts server.js against it.
// Used only when Atlas is unreachable during local E2E testing.
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  console.log('[dev-memory] starting in-memory MongoDB...');
  const mem = await MongoMemoryServer.create({
    instance: { dbName: 'housewife-services', launchTimeout: 60000 }
  });
  const uri = mem.getUri();
  console.log(`[dev-memory] MongoDB URI: ${uri}`);
  process.env.MONGODB_URI = uri;
  // Speed up bcrypt for testing (server.js doesn't override this)
  process.env.BCRYPT_ROUNDS = '4';
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';

  const shutdown = async (sig) => {
    console.log(`[dev-memory] received ${sig}, shutting down...`);
    try { await mem.stop(); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Now load the real server (it will read process.env.MONGODB_URI).
  require('./server.js');
})().catch((err) => {
  console.error('[dev-memory] fatal:', err);
  process.exit(1);
});
