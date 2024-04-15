// import { drizzle } from 'drizzle-orm/postgres-js'
// import postgres from 'postgres'


// const connectionString = process.env.DB_URL
// const client = postgres(connectionString!, {prepare: false})
// const db = drizzle(client);

// export default db;


// lib/db.ts

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';
import * as schema from './schema';

let connection: Sql<{}>;

if (process.env.NODE_ENV === 'production') {
  connection = postgres(process.env.DB_URL!);
} else {
  let globalConnection = global as typeof globalThis & {
    connection: Sql<{}>;
  };

  if (!globalConnection.connection) globalConnection.connection = postgres(process.env.DB_URL!);

  connection = globalConnection.connection;
}

const db = drizzle(connection, {schema, logger: process.env.NODE_ENV !== 'production' });

export default db;
