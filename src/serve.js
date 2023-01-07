const express = require("express");
const sqlite3 = require("sqlite3");
const app = express();
const db = new sqlite3.cached.Database("./db.sqlite", {
  mode: sqlite3.OPEN_READONLY,
});

function search_cnpj(search) {
  return new Promise((resolve, reject) => {
    db.parallelize(() => {
      db.all(
        `
        SELECT * 
        FROM empresas 
        WHERE razao_social MATCH '${search}' 
        ORDER BY rank;`,
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            let result = { data: [] };
            if (data.length == 0) {
              result.status = 404;
              result.data = {};
            } else {
              result.status = 200;
              data.forEach((row, i) => {
                result.data[i] = [row.cnpj, row.razao_social];
              });
            }
            resolve(result);
          }
        }
      );
    });
  });
}

app.get("/", (req, res) => {
  res.json(["cnpj"]);
});

app.get("/cnpj/:search", (req, res) => {
  console.log(req.params.search);
  search_cnpj(req.params.search)
    .then((result) => {
      res.status(result.status).json(result.data);
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    })
    .finally(() => {
      res.end();
    });
});

app.listen(3001, () => {
  console.log("listen 3001");
});
