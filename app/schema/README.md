# Drizzle ORM Schema for PGlite

This directory contains type-safe database schema definitions for use with Drizzle ORM and PGlite.

## Features

- Type-safe database operations
- Zod schema integration for validation
- Relation definitions between tables
- Integration with PGlite for in-memory PostgreSQL database

## Usage

### Generate Schema

```bash
bun run drizzle:generate
```

This will generate migration files in `app/schema/migrations` based on your schema definition.

### Query Examples

```typescript
import { pglite } from '~/lib/pglite';
import { navigation, navigationItems, eq } from '~/schema/schema';

// Select query
const getNavigation = async (key: string) => {
  return await pglite.db
    .select()
    .from(navigation)
    .where(eq(navigation.key, key))
    .limit(1);
};

// Insert query
const createNavigation = async (data: {
  id: string;
  name: string;
  key: string;
  data?: any;
}) => {
  return await pglite.db
    .insert(navigation)
    .values({
      id: data.id,
      name: data.name,
      key: data.key,
      data: data.data,
      createdAt: new Date(),
      syncedAt: new Date()
    })
    .returning();
};

// Join query with relations
const getNavigationWithItems = async (key: string) => {
  return await pglite.db.query.navigation.findFirst({
    where: eq(navigation.key, key),
    with: {
      items: true
    }
  });
};
```

### Validation with Zod

```typescript
import { insertNavigationSchema } from '~/schema/schema';

// Validate input data
const validateNavigationInput = (data: unknown) => {
  return insertNavigationSchema.parse(data);
};
```

## Adding New Tables

1. Define the table schema in `schema.ts`
2. Define relationships if needed
3. Create Zod schemas for validation
4. Export TypeScript types
5. Generate migrations with `bun run drizzle:generate` 