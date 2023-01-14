import crypto from "crypto";
import { spawn } from "child_process";
import { promises as fs } from "fs";


async function get_metadada_imagemagick(file_path: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const tmp_out_file = `/tmp/${crypto
      .randomBytes(4)
      .readUInt32LE()
      .toString()}.json`;

    const convert = spawn(
      "convert",
      [`'${file_path}'`, "json: >", tmp_out_file],
      {
        stdio: "ignore",
        shell: true,
      }
    );

    convert.on("close", async (code) => {
      console.log("convert close", code);
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

export default get_metadada_imagemagick;
