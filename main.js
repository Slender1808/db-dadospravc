import startBrowser from "./browser.mjs";
import fetch from "make-fetch-happen";

import sqlite3 from "sqlite3";
const db = new sqlite3.Database("/tmp/db.sqlite");

let browser = await startBrowser();

let hrefs = ["http://0.0.0.0:8080/"];
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
        if (row == undefined) {
          db.run(
            "INSERT INTO metadata (path) VALUES (?);",
            href,
            function (err) {
              if (err) {
                console.log("insert_metadata --", err);
                return reject(err);
              }
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
                    if (data == undefined) {
                      try {
                        const response = await fetch(href);
                        console.log(response.headers.get("Content-Type"));

                        if (
                          response.headers
                            .get("Content-Type")
                            .includes("text/html")
                        ) {
                          const page = await browser.newPage();
                          await page.goto(href, {
                            waitUntil: "domcontentloaded",
                          });

                          data = await page.content();
                          const new_hrefs = await page.$$eval("a", (as) =>
                            as.map((a) => {
                              let url = new URL(a.href);
                              return url.origin + url.pathname;
                            })
                          );
                          await page.close();

                          db.run(
                            "insert into file (path,data) values (?,?)",
                            [href, data],
                            async function (err) {
                              console.log("insert_file_data", this);
                              if (err) {
                                if (err.errno != 19) {
                                  console.log("insert_file_data --", err);
                                  return reject(err);
                                }
                              }
                              await scrap(new_hrefs)
                                .then(() => {
                                  return resolve();
                                })
                                .catch((err) => {
                                  return reject(err);
                                });
                            }
                          );
                        } else {
                          buffer = await response.buffer();

                          db.run(
                            "insert into file (path,data) values (?,?)",
                            [href, buffer],
                            async function (err) {
                              if (err) {
                                console.log("insert_file_buffer --", err);
                                return reject(err);
                              }
                              return resolve();
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
