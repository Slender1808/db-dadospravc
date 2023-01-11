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
  path: "/tmp/queue.db.sqlite",
});

const q: Queue = new Queue(asyncWorker, {
  concurrent: 16,
  store: store,
  maxTimeout: 3000,
  maxRetries: 3,
  retryDelay: 1000,
});

q.on("task_failed", function (taskId: any, err: any, stats: any) {
  console.log("task_finish", taskId, err, stats);
  console.log();
});

q.on("empty", function () {
  console.log("empty");
});

var batch_finish = false;
var drain_count = 0;
q.on("batch_finish", function () {
  batch_finish = true;
});

q.on("task_queued", function () {
  batch_finish = false;
});

const intervalId = setInterval(() => {
  drain_count = drain_count + (batch_finish ? 1 : 0);
  console.log(drain_count);
  if (drain_count === 16) {
    clearInterval(intervalId);
    finally_proc();
    drain_count = 0;
  }
}, 3000);

async function finally_proc() {
  const numberOfOpenPages = (await browser.pages()).length;
  console.log("number Of Open Pages", numberOfOpenPages);
  if (numberOfOpenPages == 0) {
    console.log("finally");
  }
}

var browser: any;

main();
async function main() {
  browser = await startBrowser();

  browser.on("disconnected", async () => {
    console.log("disconnected browser");
    console.log("----------------");
  });

  let hrefs = ["https://en.wikipedia.org/wiki/Main_Page"];
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
                  let page;
                  try {
                    const response = await fetch(href);
                    console.log(response.headers.get("Content-Type"));

                    const content_type: any =
                      response.headers.get("Content-Type");

                    if (content_type.includes("text/html")) {
                      page = await browser.newPage();
                      await page.goto(href, {
                        waitUntil: "domcontentloaded",
                      });
                      data = await page.content();

                      try {
                        const links_e = await page.$$("a");
                        let new_hrefs: Array<string> = [];
                        for (const link of links_e) {
                          new_hrefs.push(
                            await link.evaluate((node: any) =>
                              node.getAttribute("href")
                            )
                          );
                        }

                        new_hrefs = new_hrefs.map((new_href: string) => {
                          try {
                            new URL(new_href);
                            return new_href;
                          } catch (err) {
                            let url = new URL(href);
                            return url.origin + new_href;
                          }
                        });

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
                      } catch (err) {
                        await page.close();
                        console.log("catch get links", err);
                        cb(err);
                      }
                    } else {
                      /*
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
                      );*/

                      cb(null, null);
                    }
                  } catch (err) {
                    // An error occurred
                    console.log("catch fetch", err, href);
                    cb(err);
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
