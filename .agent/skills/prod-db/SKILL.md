---
name: SSH Prod DB
description: How to access and query the production SQLite database on Ahnenbaum.com using SSH and Docker. Use this when you need to inspect live data, run database migrations manually, or clean up data inconsistencies on the production server.
---

# Accessing the Production Database

The live Ahnenbaum production server runs via Docker on a remote VPS. The database is an SQLite file located inside the `ahnenbaum-serve` container.

## 1. Connecting to the Server

You can access the server directly via SSH:
```bash
ssh ahnenbaum
```
*(This connection profile is already set up on the local machine)*

The project files are located in `~/Ahnenbaum`.

## 2. Accessing the Database

Because the `sqlite3` CLI is **not** installed inside the Node.js production Docker container (`ahnenbaum-ahnenbaum-1`), you cannot simply run `sqlite3` against the database file.

Instead, you must run inline Node.js scripts using `better-sqlite3` executed through `docker exec`.

### Example: Running a simple query
```bash
ssh ahnenbaum "docker exec ahnenbaum-ahnenbaum-1 node -e '
  const Database = require(\"better-sqlite3\");
  const db = new Database(process.env.DATABASE_URL);
  
  const result = db.prepare(\"SELECT count(*) as cnt FROM persons WHERE deleted_at IS NULL\").get();
  console.log(\"Active persons:\", result.cnt);
'"
```

### Example: Executing an update
```bash
ssh ahnenbaum "docker exec ahnenbaum-ahnenbaum-1 node -e '
  const Database = require(\"better-sqlite3\");
  const db = new Database(process.env.DATABASE_URL);
  
  const result = db.prepare(\"UPDATE relationships SET deleted_at = CURRENT_TIMESTAMP WHERE ...\").run();
  console.log(\"Rows updated:\", result.changes);
'"
```

## Important Notes
- The database path is set via the `DATABASE_URL` environment variable inside the container (typically `/app/packages/server/data/ahnenbaum.db`).
- Use `process.env.DATABASE_URL` rather than hardcoding the path to ensure compatibility if the mount point changes.
- Always use standard Drizzle soft-delete patterns (`deleted_at = CURRENT_TIMESTAMP`) rather than `DELETE FROM` statements.
- **Never modify the schema manually**; always use Drizzle migrations.
