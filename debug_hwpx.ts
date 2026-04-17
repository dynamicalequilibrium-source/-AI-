import path from "path";
import fs from "fs";
import JSZip from "jszip";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildTable(lines: string[]): string {
  const rows = lines
    .filter(line => !line.trim().match(/^\|?[-: |]+\|?$/)) 
    .map(line => {
      let trimmed = line.trim();
      if (trimmed.startsWith('|')) trimmed = trimmed.substring(1);
      if (trimmed.endsWith('|')) trimmed = trimmed.substring(0, trimmed.length - 1);
      return trimmed.split('|').map(c => c.trim());
    });

  if (rows.length === 0) return '';

  const colCount = Math.max(...rows.map(r => r.length));
  const colWidth = Math.floor(40000 / colCount); 
  const tableId = Math.floor(Math.random() * 10000) + 1; 

  let xml = `    <hp:p paraPrIDRef="0" styleIDRef="0">\n`;
  xml += `      <hp:run charPrIDRef="6">\n`;
  xml += `        <hp:ctrl>\n`;
  xml += `          <hp:tbl id="${tableId}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropCapStyle="None" pageBreak="CELL" repeatHeader="1">\n`;
  xml += `            <hp:sz width="40000" widthRelTo="ABSOLUTE" height="0" heightRelTo="ABSOLUTE" protect="0"/>\n`;
  xml += `            <hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="CENTER" vertOffset="0" horzOffset="0"/>\n`;
  xml += `            <hp:outMargin left="0" right="0" top="0" bottom="0"/>\n`;
  xml += `            <hp:shapeComment/>\n`;
  xml += `            <hp:inMargin left="141" right="141" top="141" bottom="141"/>\n`;
  xml += `            <hp:cellSpacing>0</hp:cellSpacing>\n`;
  xml += `            <hp:borderFill borderFillIDRef="1"/>\n`;

  for (let r = 0; r < rows.length; r++) {
    xml += `            <hp:tr>\n`;
    for (let c = 0; c < colCount; c++) {
      const cellText = escapeXml(rows[r][c] || "");
      xml += `              <hp:tc borderFillIDRef="1" colSpan="1" rowSpan="1" colAddr="${c}" rowAddr="${r}" width="${colWidth}" height="1500">\n`;
      xml += `                <hp:subList>\n`;
      xml += `                  <hp:p paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="6"><hp:t>${cellText}</hp:t></hp:run></hp:p>\n`;
      xml += `                </hp:subList>\n`;
      xml += `              </hp:tc>\n`;
    }
    xml += `            </hp:tr>\n`;
  }
  
  xml += `          </hp:tbl>\n`;
  xml += `        </hp:ctrl>\n`;
  xml += `      </hp:run>\n`;
  xml += `    </hp:p>`;
  
  return xml;
}

async function test() {
  try {
    const templatePath = path.join(process.cwd(), "public", "idea.hwpx");
    const templateBuffer = fs.readFileSync(templatePath);
    const templateZip = await JSZip.loadAsync(templateBuffer);
    
    const sectionFile = templateZip.file("Contents/section0.xml");
    if (!sectionFile) throw new Error("not found");
    
    const originalXml = await sectionFile.async("string");
    console.log("Original XML start:\n" + originalXml.substring(0, 500));
    console.log("Original XML end:\n" + originalXml.substring(originalXml.length - 500));

    const rootTagMatch = originalXml.match(/<hs:sec[^>]*>/);
    const rootTag = rootTagMatch ? rootTagMatch[0] : '<hs:sec>';
    
    const secPrMatch = originalXml.match(/<hp:secPr[\s\S]*?<\/hp:secPr>/);
    let secPrXml = "";
    if (secPrMatch) {
      secPrXml = secPrMatch[0];
    } else {
      const secPrSelfCloseMatch = originalXml.match(/<hp:secPr[\s\S]*?\/>/);
      if (secPrSelfCloseMatch) {
        secPrXml = secPrSelfCloseMatch[0];
      }
    }
    
    const tableMd = ["| Header 1 | Header 2 |", "|---|---|", "| Value 1 | Value 2 |"];
    const newParas = buildTable(tableMd);
    const newSectionXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${rootTag}\n${newParas}\n${secPrXml}\n</hs:sec>`;
    
    fs.writeFileSync("test_table_section0.xml", newSectionXml);
    console.log("Wrote test_table_section0.xml");
  } catch (err) {
    console.error(err);
  }
}

test();
