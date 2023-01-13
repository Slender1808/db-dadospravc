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

var batch_finish = false;
var drain_count = 0;
var intervalId: any;

const q: Queue = new Queue(asyncWorker, {
  concurrent: 16,
  store: store,
  maxRetries: 3,
  retryDelay: 1000,
});

q.on("task_failed", function (taskId: any, err: any, stats: any) {
  console.log("task_finish", taskId, err, stats);
});

q.on("task_failed", function (taskId: any, err: any, stats: any) {
  console.log("task_failed", taskId, err, stats);
});

q.on("empty", function () {
  console.log("empty");
  batch_finish = true;
  drain_count = 0;
  finally_proc();
});

q.on("task_queued", function () {
  batch_finish = false;
  clearInterval(intervalId);
});

async function finally_proc() {
  const numberOfOpenPages = (await browser.pages()).length;
  console.log("number Of Open Pages", numberOfOpenPages);
  if (numberOfOpenPages == 0) {
    intervalId = setInterval(() => {
      drain_count = drain_count + (batch_finish ? 1 : 0);
      console.log(drain_count);
      if (drain_count === 16) {
        clearInterval(intervalId);
        console.log("finally");
        drain_count = 0;
      }
    }, 3000);
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

  scrap(hrefs);
}

async function scrap(hrefs: string[]) {
  hrefs.map((href) => {
    q.push(href);
  });
}

async function asyncWorker(href: string, cb: any) {
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
                    const response = await fetch(href, {
                      retry: {
                        maxTimeout: 5000,
                      },
                    });
                    //console.log(response.headers.get("Content-Type"));

                    const content_type: any =
                      response.headers.get("Content-Type");

                    if (content_type.includes("text/html")) {
                      page = await browser.newPage();
                      try {
                        await page.goto(href, {
                          waitUntil: "load",
                          timeout: 5000,
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
                              cb(null, null);
                            }
                          );
                        } catch (err) {
                          await page.close();
                          console.log("catch get links", err);
                          cb(err);
                        }
                      } catch (error) {
                        await page.close();
                        console.log("catch page.goto", err, href);
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
                  } catch (err: any) {
                    if (err.code != "ENOTFOUND") {
                      console.log("catch fetch", err, href);
                    }
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
