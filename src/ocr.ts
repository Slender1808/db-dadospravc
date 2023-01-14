const tesseract = require("tesseractocr");

const recognize = tesseract.withOptions({
  output: "txt",
  oem: 1,
});

async function get_ocr(file_path: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const text = await recognize(file_path);
      resolve(text);
    } catch (err) {
      console.log("err", err);
      reject();
    }
  });
}

export default get_ocr;
