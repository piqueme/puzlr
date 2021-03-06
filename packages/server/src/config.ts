import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { LoggingScope as ServerLoggingScope } from './logger'
import { LoggingScope as CoreLoggingScope } from '@puzlr/core'

const PROJECT_ROOT = path.resolve(
  path.join(__dirname, '..', '..', '..')
)

dotenv.config({ path: path.resolve(PROJECT_ROOT, '.env') })

type LoggingScope = typeof ServerLoggingScope | typeof CoreLoggingScope
export type Config = {
  clientOrigin: string;
  clientIP: string;
  clientPort: number | undefined;
  serverURI: string;
  serverIP: string;
  serverPort: number;
  databaseURI: string;
  databaseUser: string | undefined;
  databasePassword: string | undefined;
  logging: Record<LoggingScope, string>;
}

async function getSecret(secretName: string, fallback = ''): Promise<string> {
  const secretFileName = path.join('/run', 'secrets', secretName)
  try {
    const secret = await fs.promises.readFile(secretFileName, 'utf-8')
    return secret.trim()
  } catch (e) {
    return fallback
  }
}

function getAddress(ip: string, port?: string): string {
  return port && port.length > 0 ?
    `http://${ip}:${port}` : `http://${ip}`
}

export default async(): Promise<Config> => {
  const secretDropletHost = await getSecret('droplet_host', '127.0.0.1')
  const secretDbUsername = await getSecret('mongodb_root_username', 'root')
  const secretDbPassword = await getSecret('mongodb_root_password', 'pass123')

  return {
    clientOrigin: getAddress(
      (process.env['CLIENT_IP'] || secretDropletHost) as string,
      process.env['CLIENT_PORT']
    ),
    clientIP: (process.env['CLIENT_IP'] || secretDropletHost) as string,
    clientPort: process.env['CLIENT_PORT'] ? parseInt(process.env['CLIENT_PORT']) : undefined,
    serverURI: getAddress(
      process.env['SERVER_IP'] as string,
      process.env['SERVER_PORT']
    ),
    serverIP: process.env['SERVER_IP'] as string,
    serverPort: parseInt(process.env['SERVER_PORT'] as string),
    databaseURI: process.env['DB_URI'] as string,
    databaseUser: (process.env['DB_USERNAME'] || secretDbUsername) as string,
    databasePassword: (process.env['DB_PASSWORD'] || secretDbPassword) as string,
    logging: {
      core: "info",
      server: "info"
    }
  }
}
