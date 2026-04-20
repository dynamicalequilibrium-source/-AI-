import AdmZip from "adm-zip";

try {
  const zip = new AdmZip("public/idea.hwpx");
  const sectionEntry = zip.getEntry("Contents/section0.xml");
  if (sectionEntry) {
    const xml = sectionEntry.getData().toString("utf8");
    console.log(xml.substring(0, 500));
    console.log("...");
    console.log(xml.substring(xml.length - 500));
  }
} catch (e) {
  console.error(e);
}
