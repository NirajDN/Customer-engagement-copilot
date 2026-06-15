const net = require('net');
const { URL } = require('url');

const dbUrlStr = process.env.DATABASE_URL;
if (!dbUrlStr) {
  console.log("No DATABASE_URL environment variable set. Skipping wait.");
  process.exit(0);
}

try {
  const parsed = new URL(dbUrlStr);
  const host = parsed.hostname;
  const port = parsed.port || 5432;

  console.log(`Waiting for database at ${host}:${port}...`);

  const maxRetries = 30;
  let retries = 0;

  function checkConnection() {
    const socket = new net.Socket();
    socket.setTimeout(2000);

    socket.on('connect', () => {
      console.log('Database is up and reachable!');
      socket.destroy();
      process.exit(0);
    });

    socket.on('timeout', () => {
      socket.destroy();
      retry();
    });

    socket.on('error', (err) => {
      socket.destroy();
      retry();
    });

    socket.connect(port, host);
  }

  function retry() {
    retries++;
    if (retries >= maxRetries) {
      console.error(`Database not reachable after ${maxRetries} retries. Exiting.`);
      process.exit(1);
    }
    console.log(`Database not reachable yet. Retrying in 3 seconds... (${retries}/${maxRetries})`);
    setTimeout(checkConnection, 3000);
  }

  checkConnection();
} catch (err) {
  console.error("Failed to parse DATABASE_URL:", err);
  process.exit(1);
}
