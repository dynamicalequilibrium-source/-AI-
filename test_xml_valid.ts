import AdmZip from "adm-zip";

try {
  const zip = new AdmZip("public/idea.hwpx");
  const mimetype = zip.readAsText("mimetype");
  console.log("mimetype:", mimetype);
} catch (e) {
  console.error(e);
}