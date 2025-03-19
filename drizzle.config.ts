import type { Config } from 'drizzle-kit';

export default {
  schema: './app/schema/schema.ts',
  out: './app/schema/migrations',
  // For local development with PGlite (which is PostgreSQL-compatible)
  dialect: 'postgresql',
  // We don't need real DB credentials since we're using PGlite in-memory
  // This is just a placeholder for the schema generation
  dbCredentials: {
    host: 'localhost',
    port: 5432,
    database: 'local_db',
    user: 'user',
    password: 'password',
  }
} satisfies Config; 