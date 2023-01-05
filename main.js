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

    db.get("SELECT * FROM metadata WHERE path = (?);", href, (err, row) => {
      if (err) {
        console.log("duplicado metadata");
        return reject(err);
      } else {
        console.log(row);
        if (row == undefined) {
          db.run(
            "INSERT INTO metadata (path) VALUES (?);",
            href,
            function (err) {
              if (err) {
                console.log("insert_metadata --", err);
                return reject(err);
              }
              console.log("insert_metadata ++", this);

              db.get(
                `
                  SELECT path 
                  FROM file 
                  WHERE path = (?);`,
                "http://0.0.0.0:8080/pai/",
                async (err, data) => {
                  if (err) {
                    console.log("duplicado file");
                    return reject(err);
                  } else {
                    console.log(data);
                    if (data == undefined) {
                      try {
                        const response = await fetch(href);
                        console.log(response.headers.get("Content-Type"));

                        if (
                          response.headers
                            .get("Content-Type")
                            .includes("text/html")
                        ) {
                          console.log("newPage", href);
                          const page = await browser.newPage();
                          console.log("goto");
                          await page.goto(href, {
                            waitUntil: "domcontentloaded",
                          });

                          data = await page.content();
                          await page.close();

                          db.run(
                            "insert into file (path,data) values (?,?)",
                            [href, data],
                            function (err) {
                              console.log("insert_file_data", this);
                              if (err) {
                                if (err.errno != 19) {
                                  console.log("insert_file_data --", err);
                                  return reject(err);
                                }
                              }
                              return resolve();
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
                              resolve();
                            }
                          );
                        }
                      } catch (err) {
                        // An error occurred
                        console.log("catch", err);
                        reject(err);
                      }
                    } else {
                      return resolve();
                    }
                  }
                }
              );
            }
          );
        } else {
          return resolve();
        }
      }
    });
  });
}

db.serialize(() => {
  scrap(hrefs)
    .catch((error) => {
      console.log(error);
    })
    .finally(async () => {
      console.log("scrap finally --------");
      db.close();
      await browser.close();
    });
});
