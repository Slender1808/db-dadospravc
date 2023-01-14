import { promises as fs } from "fs";
import { loadModule } from "cld3-asm";

async function get_language_detector(
  value: string,
  file: boolean
): Promise<string> {
  const cldFactory = await loadModule();
  return new Promise(async (resolve, reject) => {
    if (file) {
      try {
        const contents = await fs.readFile(value, {
          encoding: "utf8",
        });

        const identifier = cldFactory.create(0, contents.length * 8);

        const findResult = identifier.findLanguage(contents);
        resolve(findResult.language);
      } catch (err) {
        console.log("err", err);
        reject();
      }
    } else {
      try {
        const identifier = cldFactory.create(0, value.length * 8);

        const findResult = identifier.findLanguage(value);
        resolve(findResult.language);
      } catch (err) {
        console.log("err", err);
        reject();
      }
    }
  });
}

export default get_language_detector;
