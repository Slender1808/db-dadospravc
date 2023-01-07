//import * as fastq from "fastq";
//import type { queueAsPromised } from "fastq";
//const q: queueAsPromised<String> = fastq.promise(asyncWorker, 8);

import startBrowser from "./browser";
import fetch from "make-fetch-happen";

import sqlite3 from "sqlite3";
var db = new sqlite3.Database("/tmp/db.sqlite");

import Queue = require("better-queue");
const SqliteStore = require("better-queue-sqlite");

const store = new SqliteStore({
  type: "sql",
  dialect: "sqlite",
  path: "./queue.db.sqlite",
});

const q: Queue = new Queue(asyncWorker, {
  concurrent: 8,
  store: store,
});

q.on("task_failed", function (taskId: any, err: any, stats: any) {
  console.log("task_finish", taskId, err, stats);
});

var browser: any;

main();
async function main() {
  browser = await startBrowser();

  let hrefs = ["http://0.0.0.0:8080/"];
  console.log(hrefs);

  await scrap(hrefs);
}

function scrap(hrefs: string[]) {
  hrefs.map((href) => {
    q.push(href);
  });
}

async function asyncWorker(href: string, cb: any): Promise<any> {
  console.log(href);
  db.get("SELECT * FROM metadata WHERE path = (?);", href, (err, row) => {
    if (err) {
      console.log("duplicado metadata");
      cb(null, null);
    } else {
      if (row == undefined) {
        db.run("INSERT INTO metadata (path) VALUES (?);", href, function (err) {
          if (err) {
            console.log("insert_metadata --", err);
            cb(null, null);
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
                cb(null, null);
              } else {
                if (data == undefined) {
                  try {
                    const response = await fetch(href);
                    console.log(response.headers.get("Content-Type"));

                    const content_type: any =
                      response.headers.get("Content-Type");

                    if (content_type.includes("text/html")) {
                      const page = await browser.newPage();
                      await page.goto(href, {
                        waitUntil: "domcontentloaded",
                      });

                      data = await page.content();
                      const new_hrefs = await page.$$eval("a", (as: any) =>
                        as.map((a: any) => {
                          let url = new URL(a.href);
                          return url.origin + url.pathname;
                        })
                      );
                      await page.close();

                      db.run(
                        "insert into file (path,data) values (?,?)",
                        [href, data],
                        async function (err: any) {
                          console.log("insert_file_data", this);
                          if (err) {
                            if (err.errno != 19) {
                              console.log("insert_file_data --", err);
                              cb(null, null);
                            }
                          }
                          scrap(new_hrefs);
                        }
                      );
                    } else {
                      const buffer = await response.buffer();

                      db.run(
                        "insert into file (path,data) values (?,?)",
                        [href, buffer],
                        async function (err) {
                          if (err) {
                            console.log("insert_file_buffer --", err);
                          }
                          cb(null, null);
                        }
                      );
                    }
                  } catch (err) {
                    // An error occurred
                    console.log("catch", err);
                    cb(null, null);
                  }
                } else {
                  cb(null, null);
                }
              }
            }
          );
        });
      } else {
        cb(null, null);
      }
    }
  });
}
