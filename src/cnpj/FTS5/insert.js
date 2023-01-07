const readline = require("readline");
const fs = require("fs");
const sqlite3 = require("sqlite3");

const db = new sqlite3.Database("/tmp/db.sqlite");
const csv = readline.createInterface({
  input: fs.createReadStream("./empresas.csv"),
});

let log = 0;
db.parallelize(() => {
  csv
    .on("line", (line) => {
      log++;
      if (log != 1) {
        //45.153.759
        const col = line.split(",");
        db.run(
          "insert into empresas (cnpj,razao_social) values (?,?)",
          [col[0], col[1].replace(/"/g, "")],
          async (error) => {
            if (log % 8 == 0) {
              console.log(((log * 100) / 45153759).toFixed(2), col[0]);
            }
            if (error) {
              console.log(log, line);
              console.log(error);
              csv.close();
              csv.removeAllListeners();
            }
          }
        );
      }
    })
    .on("close", () => {
      db.close(() => {
        console.log("FIM");
      });
    });
});
