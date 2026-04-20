import fs from 'fs';
import JSZip from 'jszip';

async function run() {
  const buf = fs.readFileSync("public/idea.hwpx");
  const zip = await JSZip.loadAsync(buf);
  const headerXml = await zip.file("Contents/header.xml")!.async("string");
  
  // count charPr and paraPr
  const charPrCount = (headerXml.match(/<hh:charPr /g) || []).length;
  const paraPrCount = (headerXml.match(/<hh:paraPr /g) || []).length;
  console.log("charPrCount:", charPrCount, "paraPrCount:", paraPrCount);
}
run();