import AdmZip from "adm-zip";

try {
  const zip = new AdmZip("public/idea.hwpx");
  const sectionEntry = zip.getEntry("Contents/section0.xml");
  if (sectionEntry) {
    const xml = sectionEntry.getData().toString("utf8");
    const pMatch = xml.match(/<hp:p[^>]*>[\s\S]*?<\/hp:p>/);
    if (pMatch) {
      console.log(pMatch[0].length);
      console.log(pMatch[0].substring(0, 400));
      console.log(pMatch[0].substring(pMatch[0].length - 100));
    }
  }
} catch (e) {
  console.error(e);
}
