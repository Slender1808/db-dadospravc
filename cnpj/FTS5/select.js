const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("./db.sqlite");

razao_social("open BRASIL");
async function razao_social(name) {
  const query = `
  SELECT * 
  FROM posts 
  WHERE posts MATCH '${name.toUpperCase()}' 
  ORDER BY rank;`;

  console.log(query);
  let data;
  await test(query).then((e) => (data = e));

  console.log(data);
}
function test(sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, row) => {
      if (err) {
        console.log("callback has error ...");
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}
