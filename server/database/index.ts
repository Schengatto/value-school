import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null
let _pool: pg.Pool | null = null

export function useDB() {
  if (!_db) {
    const config = useRuntimeConfig()
    _pool = new pg.Pool({
      connectionString: config.databaseUrl
    })
    _db = drizzle(_pool, { schema })
  }
  return _db
}

export async function closeDB() {
  if (_pool) {
    await _pool.end()
    _pool = null
    _db = null
  }
}
