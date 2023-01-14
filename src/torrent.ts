import WebTorrent from "webtorrent";
import crypto from "crypto";
import { spawn } from "child_process";
import path from "path";
import { promises as fs } from "fs";
import { createReadStream } from "fs";
import NodeID3 from "node-id3";
import YAML from "yaml";
import get_metadada_imagemagick from "./metadada_imagemagick";
import get_ocr from "./ocr";
import get_language_detector from "./language_detector";
import mime from "mime-types";
import get_xml from "./xml";

var index_hash = 1;

const path_torrent = path.resolve("./torrent/");

const opts = {
  announce: [
    "http://bt1.archive.org:6969/announce",
    "http://bt2.archive.org:6969/announce",
    "http://retracker.joxnet.ru:80/announce",
    "http://tracker.files.fm:6969/announce",
    "udp://www.torrent.eu.org:451/announce",
    "udp://exodus.desync.com:6969/announce",
    "udp://open.stealth.si:80/announce",
    "udp://ipv4.tracker.harry.lu:80/announce",
    "udp://9.rarbg.com:2920/announce",
    "udp://tracker.opentrackr.org:1337",
    "udp://explodie.org:6969",
    "wss://tracker.btorrent.xyz",
    "wss://tracker.openwebtorrent.com",
    "udp://tracker.leechers-paradise.org:6969",
    "udp://tracker.coppersurfer.tk:6969",
    "udp://tracker.empire-js.us:1337",
  ],
  maxWebConns: 128,
  path: path_torrent,
};

console.log(opts);

let client = new WebTorrent({ dht: true, utp: true, tracker: true });

client.on("error", (err: any) => {
  console.log("ERRO", err);
});

scrap(index_hash).then(() => {
  console.log("scrap then");
});

async function scrap(hash: number) {
  return new Promise((resolve, reject) => {
    const hash_torretn = "e2ddd935d6b6129b1bbb9b1e021cf002426e3921"; //hash.toString(16)

    var files: Array<any> = [];

    const time = new Date().getTime();

    console.log("hash_torretn", hash_torretn);

    const intervalId = setInterval(() => {
      if (files.length == 0) {
        let now: any = new Date();
        now = new Date(now - 30000);
        console.log("interval time", time - now);
        if (now > time) {
          clearInterval(intervalId);
          console.log("timeout");
          client.remove(hash_torretn, { destroyStore: true });
        }
      } else {
        clearInterval(intervalId);
      }
    }, 10000);

    client.add(hash_torretn, opts, (torrent: any) => {
      torrent.files.find(function (file: any) {
        files.push({ path: file.path, length: file.length });
      });

      console.log("torrent files", files);

      torrent.on("done", async () => {
        console.log("torrent finished downloading");
        try {
          const data_files = await Promise.all(
            files.map((file) => {
              return new Promise(async (resolve, reject) => {
                const file_path = path.join(torrent.path, file.path);
                const mime_type = mime.lookup(file_path);
                resolve(
                  YAML.stringify(
                    await get_data(file_path, String(mime_type), file.length)
                  )
                );
              });
            })
          );
          console.log("data_files", data_files);
        } catch (error) {
          console.log("error data_files", error);
        } finally {
          console.log("destroy torrent");
          torrent.destroy({ destroyStore: true });
          resolve(null);
        }
      });
    });
  });
}

async function get_data(file_path: string, type: string, file_length: number) {
  console.log(type);
  return new Promise(async (resolve, reject) => {
    try {
      const obj_path = path.parse(file_path);

      const hash_file = await create_sha_file(file_path);
      console.log("hash_file", hash_file);

      let data = {
        name: obj_path.name,
        extension: obj_path.ext,
        length: file_length,
        sha1: hash_file,
        mime_type: type,
        content: "",
        ffmpeg: {},
        id3: {},
        imagemagick: {},
        ocr: "",
        language: {},
        comments: {}
      };

      if (type.includes("text") && type != "text/json") {
        data.content = await get_text(file_path);
        data.language = await get_language_detector(file_path, true);
        return resolve(data);
      } else if (type.includes("json")) {
        const file = await get_text(file_path);
        const json = comment_lines(file);
        data.comments = json.comments
        data.content = JSON.parse(json.value);
        data.language = await get_language_detector(file_path, true);
        return resolve(data);
      } else if (type.includes("xml")) {
        data.content = await get_xml(file_path);
        data.language = await get_language_detector(file_path, true);
        return resolve(data);
      } else if (type.includes("pdf")) {
        data.ffmpeg = await get_metadada_ffmpeg(file_path);
        return resolve(data);
      } else if (type.includes("video")) {
        data.ffmpeg = await get_metadada_ffmpeg(file_path);
        return resolve(data);
      } else if (type.includes("audio")) {
        data.ffmpeg = await get_metadada_ffmpeg(file_path);
        data.id3 = await get_id3(file_path);
        return resolve(data);
      } else if (type.includes("image")) {
        data.imagemagick = await get_metadada_imagemagick(file_path);
        data.ocr = await get_ocr(file_path);
        data.language = await get_language_detector(data.ocr, false);
        return resolve(data);
      } else {
        return resolve(data);
      }
    } catch (error) {
      console.log("error get_data", error);
      return reject(error);
    }
  });
}

function comment_lines(input: string) {
  let lines = input.split("\n");
  let comments = [];
  let value = String();

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.startsWith("//")) {
      comments.push(line);
    } else {
      value += line;
    }
  }

  return { value, comments };
}

async function create_sha_file(file_path: string) {
  return new Promise(async (resolve, reject) => {
    const hash = crypto.createHash("sha1");

    const stream = createReadStream(file_path);
    stream.on("data", (data) => {
      hash.update(data);
    });

    stream.on("end", () => {
      const finalHash = hash.digest("hex");
      resolve(finalHash);
    });
  });
}

async function get_text(file_path: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const contents = await fs.readFile(file_path, {
        encoding: "utf8",
      });

      resolve(contents);
    } catch (err) {
      console.log("err", err);
      reject();
    }
  });
}

async function get_id3(file_path: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
      const tags = NodeID3.read(file_path, {
        onlyRaw: false,
        noRaw: true,
      });
      resolve(tags);
    } catch (err) {
      console.log("err", err);
      reject();
    }
  });
}

async function get_metadada_ffmpeg(file_path: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const tmp_out_file = `/tmp/${crypto
      .randomBytes(4)
      .readUInt32LE()
      .toString()}.json`;

    const ffprobe = spawn(
      "ffprobe",
      [
        "-print_format json -show_entries stream -v quiet",
        `'${file_path}'`,
        ">",
        tmp_out_file,
      ],
      {
        stdio: "ignore",
        shell: true,
      }
    );

    ffprobe.on("close", async (code) => {
      console.log("ffprobe close", code);
      if (code == 0) {
        try {
          const contents = await fs.readFile(tmp_out_file, {
            encoding: "utf8",
          });

          fs.unlink(tmp_out_file);
          resolve(JSON.parse(contents));
        } catch (err) {
          console.log("err", err);
          reject();
        }
      } else {
        console.log(`child process exited with code ${code}`);
        reject();
      }
    });
  });
}
