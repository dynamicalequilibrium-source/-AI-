import fs from "fs";
import https from "https";

https.get("https://raw.githubusercontent.com/edwardkim/rhwp/main/README.md", (res) => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => console.log(data));
});