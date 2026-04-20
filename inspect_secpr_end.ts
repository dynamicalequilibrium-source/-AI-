import AdmZip from "adm-zip";

try {
  const zip = new AdmZip("public/idea.hwpx");
  const sectionEntry = zip.getEntry("Contents/section0.xml");
  if (sectionEntry) {
    const xml = sectionEntry.getData().toString("utf8");
    const secPrMatch = xml.match(/(<hp:secPr[\s\S]*?(?:\/>|<\/hp:secPr>))/);
    console.log(secPrMatch![1].substring(0, 500));
  }
} catch (e) {
  console.error(e);
}
