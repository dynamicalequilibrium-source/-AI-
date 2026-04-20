import JSZip from "jszip";

async function run() {
  const newZip = new JSZip();
  newZip.file("mimetype", "application/hwp+zip", { compression: "STORE" });
  newZip.file("hello", "world");
  
  const buf = await newZip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  // local file header signature is 50 4B 03 04
  // Check string representation of the first 50 bytes:
  console.log(buf.slice(0, 100).toString('hex'));
  
  // also decode printable characters safely
  let str = "";
  for(let i=0; i<100; i++) {
    if (buf[i] >= 32 && buf[i] <= 126) str += String.fromCharCode(buf[i]);
    else str += ".";
  }
  console.log(str);
}
run();