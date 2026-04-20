import AdmZip from "adm-zip";
import fs from "fs";

try {
  const zip = new AdmZip("public/idea.hwpx");
  zip.updateFile("Contents/section0.xml", Buffer.from("test", "utf8"));
  const buf = zip.toBuffer();
  
  // write to a temp file and check header
  fs.writeFileSync("temp.hwpx", buf);
  const outZip = new AdmZip("temp.hwpx");
  console.log("Out zip entries:", outZip.getEntries().map(e => e.entryName));
} catch (e) {
  console.error(e);
}
