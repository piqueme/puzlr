import { MongoMemoryServer } from 'mongodb-memory-server'
import type { Config } from './config'

export default async(): Promise<Config> => {
  const mongod = await MongoMemoryServer.create()
  const databaseURI = mongod.getUri()

  return {
    serverURI: 'http://127.0.0.1:8080',
    databaseURI,
    databaseUser: process.env['DB_USERNAME'] as string,
    databasePassword: process.env['DB_PASSWORD'] as string
  }
}