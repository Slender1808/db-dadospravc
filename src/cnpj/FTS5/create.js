const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("/tmp/db.sqlite");

db.serialize(() => {
  db.run(`
    CREATE VIRTUAL TABLE empresas 
    USING FTS5(
      cnpj
      razao_social
    );
  `);
});
