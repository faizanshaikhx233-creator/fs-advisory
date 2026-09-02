const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const file = "C:\\Users\\ADMIN\\Downloads\\Faizan Data\\F.S Advisory\\Bank Statement\\Wio fs advisory.pdf";
const buf = fs.readFileSync(file);

(async () => {
  const parser = new PDFParse({ data: buf });
  const res = await parser.getText({ pageJoiner: "\n" });
  fs.writeFileSync("C:\\Users\\ADMIN\\AppData\\Local\\Temp\\opencode\\wio.txt", res.text);
  console.log("Text length:", res.text.length);
})().catch(e => console.error("ERR", e.message));
