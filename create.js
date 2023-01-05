import sqlite3 from "sqlite3";
const db = new sqlite3.Database("/tmp/db.sqlite");

db.serialize(() => {
  db.run(`
    CREATE VIRTUAL TABLE file USING FTS5(
      path,
      data
    );
  `);

  db.run(`
    CREATE TABLE "metadata" (
      "path"	TEXT NOT NULL UNIQUE,
      PRIMARY KEY("path")
    );
  `);

  db.close();
});
