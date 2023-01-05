import startBrowser from "./browser.mjs";
import fetch from "make-fetch-happen";

import sqlite3 from "sqlite3";
const db = new sqlite3.Database("/tmp/db.sqlite");

let browser = await startBrowser();

let hrefs = ["http://0.0.0.0:8080/", "http://0.0.0.0:8080/pai/"];
let data = String();
let buffer;
console.log(hrefs);

/*
const insert_metadata = db.prepare(
  "INSERT OR IGNORE INTO metadata (path) VALUES (?);"
);

const insert_file = db.prepare("insert into file (path,data) values (?,?)");
*/

async function scrap(hrefs) {
  return Promise.all(hrefs.map((href) => insert(href)));
}

async function insert(href) {
  return new Promise((resolve, reject) => {
    console.log(href);

    db.run(
      "INSERT INTO metadata (path) VALUES (?);",
      href,
      async function (err) {
        if (err) {
          if (err.errno != 19) {
            console.log("insert_metadata --", err);
            return reject(err);
          }
        }
        console.log("insert_metadata ++", this);
        try {
          const response = await fetch(href);
          console.log(response.headers.get("Content-Type"));

          if (response.headers.get("Content-Type").includes("text/html")) {
            const page = await browser.newPage();
            await page.goto(href, { waitUntil: "domcontentloaded" });

            data = await page.content();
            page.close();

            db.run(
              "insert into file (path,data) values (?,?)",
              [href, data],
              async function (err) {
                if (err) {
                  if (err.errno != 19) {
                    console.log("insert_file_data --", err);
                    return reject(err);
                  }
                }
              }
            );

            //await scrap(await page.$$eval("a", (as) => as.map((a) => a.href)));
          } else {
            buffer = await response.buffer();

            db.run(
              "insert into file (path,data) values (?,?)",
              [href, buffer],
              async function (err) {
                if (err.errno != 19) {
                  console.log("insert_file_buffer --", err);
                  return reject(err);
                }
              }
            );
          }
          resolve();
        } catch (err) {
          // An error occurred
          reject(err);
        }
      }
    );
  });
}

db.serialize(() => {
  scrap(hrefs)
    .catch((error) => {
      console.log(error);
    })
    .finally(async () => {
      console.log("scrap finally --------");
      //insert_metadata.finalize();
      //insert_file.finalize();
      db.close();
      await browser.close();
    });
});
