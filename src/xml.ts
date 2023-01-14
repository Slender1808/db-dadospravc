const { XMLParser } = require("fast-xml-parser");
import { promises as fs } from "fs";

const parser = new XMLParser();

function get_xml(file_path: string): Promise<any>  {
  return new Promise(async (resolve, reject) => {
    try {
      const contents = await fs.readFile(file_path);
      resolve(parser.parse(contents));
    } catch (err) {
      console.log("err", err);
      reject();
    }
  });
}

export default get_xml;
