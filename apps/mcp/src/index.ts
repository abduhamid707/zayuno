import * as dotenv from 'dotenv';
import { runStdioServer, runHttpSseServer } from './server.js';

dotenv.config();

const mode = process.env.MCP_MODE || (process.argv.includes('--http') ? 'http' : 'stdio');

if (mode === 'http') {
  const port = parseInt(process.env.MCP_PORT || '4002', 10);
  runHttpSseServer(port);
} else {
  runStdioServer().catch((err) => {
    console.error('Fatal error running MCP Stdio server:', err);
    process.exit(1);
  });
}
