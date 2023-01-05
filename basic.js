/*
import startBrowser from "./browser.mjs";

let browser = await startBrowser();
const page = await browser.newPage();

await page.goto("http://0.0.0.0:8080/pai/", { waitUntil: "domcontentloaded" });
await page.close();
await browser.close();
*/

/*
import sqlite3 from "sqlite3";
const db = new sqlite3.Database("/tmp/db.sqlite");

db.parallelize(() => {
  db.all(
    `
      SELECT path 
      FROM file 
      WHERE data MATCH 'estados' 
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
*/

/*
import sqlite3 from "sqlite3";
const db = new sqlite3.Database("/tmp/db.sqlite");

db.parallelize(() => {
  db.all(
    `
      SELECT path 
      FROM file 
      WHERE data MATCH 'estados' 
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
*/

import sqlite3 from "sqlite3";
const db = new sqlite3.Database("/tmp/db.sqlite");

db.parallelize(() => {
  db.get(
    `
      SELECT path 
      FROM file 
      WHERE path = (?);`,
    "http://0.0.0.0:8080/pai/",
    (err, data) => {
      if (err) {
        console.log(err);
      } else {
        console.log(data);
      }
    }
  );
});
