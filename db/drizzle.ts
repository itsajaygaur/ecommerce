import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'


const connectionString = process.env.DB_URL
const client = postgres(connectionString!, {prepare: false})
const db = drizzle(client);

// const details =  db.select('')

export default db;

