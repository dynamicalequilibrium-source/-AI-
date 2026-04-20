import AdmZip from "adm-zip";

try {
  const zip = new AdmZip("public/idea.hwpx");
  const sectionEntry = zip.getEntry("Contents/section0.xml");
  if (sectionEntry) {
    const xml = sectionEntry.getData().toString("utf8");
    const idx = xml.indexOf("</hp:secPr>");
    console.log("IndexOf </hp:secPr>:", idx);
    if (idx !== -1) {
       console.log("secPr length:", idx + 11 - xml.indexOf("<hp:secPr"));
    }
  }
} catch (e) {
  console.error(e);
}
