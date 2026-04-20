import AdmZip from "adm-zip";

try {
  const zip = new AdmZip("public/idea.hwpx");
  const sectionEntry = zip.getEntry("Contents/section0.xml");
  if (sectionEntry) {
    const xml = sectionEntry.getData().toString("utf8");
    const secPrMatch = xml.match(/<hp:secPr[\s\S]*?(\/>|<\/hp:secPr>)/);
    if (secPrMatch) {
      console.log("secPr found at index:", secPrMatch.index);
      console.log("Length of XML:", xml.length);
      console.log(secPrMatch[0]);
    } else {
      console.log("secPr NOT found!");
    }
  }
} catch (e) {
  console.error(e);
}
