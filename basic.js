/*import startBrowser from "./browser.mjs";

let browser = await startBrowser();
const page = await browser.newPage();

await page.goto("http://0.0.0.0:8080/", { waitUntil: "domcontentloaded" });*/

import sqlite3 from "sqlite3";
const db = new sqlite3.Database("/tmp/db.sqlite");

db.parallelize(() => {
  db.all(
    `
      SELECT * 
      FROM file 
      WHERE data MATCH 'Acre' 
      ORDER BY rank;`,
    (err, data) => {
      if (err) {
        console.log(err);
      } else {
        console.log(data);
      }
    }
  );
});
