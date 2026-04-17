import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import mammoth from "mammoth";
import axios from "axios";
import JSZip from "jszip";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const AdmZip = require("adm-zip");
const HWP = require("hwp.js");
const xml2js = require("xml2js");
let pdf: any;
try {
  const _pdf = require("pdf-parse");
  pdf = _pdf.default || _pdf;
} catch (e) {
  console.error("Failed to load pdf-parse:", e);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Multer for file uploads
  const upload = multer({ storage: multer.memoryStorage() });

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    console.log("Health check requested");
    res.json({ status: "ok" });
  });

  // API Route: Download Template
  app.get("/api/download-template", (req, res) => {
    const filePath = path.join(__dirname, "public", "idea.hwpx");
    res.download(filePath, "아이디어(양식).hwpx", (err) => {
      if (err) {
        console.error("Download error:", err);
        if (!res.headersSent) {
          res.status(500).send("파일을 다운로드할 수 없습니다.");
        }
      }
    });
  });

  // ===========================
  // 로컬 HWPX 직접 생성 유틸리티 (템플릿 인젝션 방식)
  // ===========================
  function escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  interface RunPart { text: string; bold: boolean; }

  function parseInline(text: string): RunPart[] {
    const parts: RunPart[] = [];
    const re = /\*\*(.*?)\*\*/g;
    let last = 0, m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push({ text: text.slice(last, m.index), bold: false });
      parts.push({ text: m[1], bold: true });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push({ text: text.slice(last), bold: false });
    return parts.length ? parts : [{ text, bold: false }];
  }

  // 템플릿(idea.hwpx)의 header.xml 분석 결과 기반 ID 매핑
  const TPL_IDS = {
    PARA: { h1: "19", h2: "23", h3: "0", h4: "0", paragraph: "0", empty: "0" },
    CHAR: { h1: "10", h2: "4", h3: "14", h4: "5", paragraph: "6", bold: "11" }
  };

  function buildPara(line: string): string {
    let text = line.trim();
    let type: keyof typeof TPL_IDS.PARA = 'paragraph';

    if (/^[-*]?\s*\[?서식\s*\d+\]?\s*/.test(text)) {
      type = 'h1'; 
      text = text.replace(/^[-*]?\s*\[?서식\s*\d+\]?\s*/, '').trim();
    }
    else if (text.startsWith("핵심 요약")) { type = 'h1'; }
    else if (/^[-*]?\s*\d+\.\s+/.test(text)) {
      type = 'h2'; 
      text = text.replace(/^[-*]?\s*\d+\.\s+/, '').trim();
    }
    else if (/^[-*]?\s*\d+(-\d+)+\.\s+/.test(text)) {
      type = 'h3'; 
      text = text.replace(/^[-*]?\s*\d+(-\d+)+\.\s+/, '').trim();
    }
    else if (/^#{1}\s+/.test(text)) { type = 'h1'; text = text.replace(/^#\s+/, '').trim(); }
    else if (/^#{2}\s+/.test(text)) { type = 'h2'; text = text.replace(/^##\s+/, '').trim(); }
    else if (/^#{3}\s+/.test(text)) { type = 'h3'; text = text.replace(/^###\s+/, '').trim(); }
    else if (/^#{4,}\s+/.test(text)) { type = 'h4'; text = text.replace(/^#{4,}\s+/, '').trim(); }
    else if (!text) { type = 'empty'; }

    const paraId = TPL_IDS.PARA[type];
    const baseCharId = TPL_IDS.CHAR[type === 'empty' ? 'paragraph' : type as keyof typeof TPL_IDS.CHAR];
    const runs = parseInline(text);

    const runsXml = runs.map((r) => {
      const charId = r.bold ? TPL_IDS.CHAR.bold : baseCharId;
      return `      <hp:run charPrIDRef="${charId}"><hp:t>${escapeXml(r.text)}</hp:t></hp:run>`;
    }).join('\n');

    const finalRunsXml = runsXml || `      <hp:run charPrIDRef="${baseCharId}"><hp:t></hp:t></hp:run>`;

    return `    <hp:p paraPrIDRef="${paraId}">\n${finalRunsXml}\n    </hp:p>`;
  }

  function buildTable(lines: string[]): string {
    const rows = lines
      .filter(line => !line.match(/^\|[-: |]+\|$/)) 
      .map(line => line.split('|').filter(cell => cell !== '').map(c => c.trim()));

    if (rows.length === 0) return '';

    const colCount = rows[0].length;
    const colWidth = Math.floor(40000 / colCount); 
    const tableId = Math.floor(Math.random() * 10000) + 1; 

    // 표(<hp:tbl>)를 문단(<hp:p>) 바로 아래에 위치 (HWPX 규격 준수)
    let xml = `    <hp:p paraPrIDRef="0">\n`;
    
    // 속성값 대소문자 및 필수 속성 위주로 재정리
    xml += `        <hp:tbl id="${tableId}" zOrder="0" numberingType="Table" textWrap="TopAndBottom" halfTextWrap="false" textFlow="BothSides" lock="false" dropCapStyle="None">\n`;
    xml += `          <hp:sz width="${colWidth * colCount}" widthRelTo="Paper" height="2000" heightRelTo="Absolute" protect="false"/>\n`;
    xml += `          <hp:pos treatAsChar="true" affectLSpacing="false" flowWithText="true" allowOverlap="false" holdAnchorAndSO="false" vertRelTo="Paragraph" horzRelTo="Column" vertAlign="Top" horzAlign="Center" vertOffset="0" horzOffset="0"/>\n`;
    xml += `          <hp:outMargin left="0" right="0" top="0" bottom="0"/>\n`;
    xml += `          <hp:shapeComment/>\n`;
    xml += `          <hp:inMargin left="141" right="141" top="141" bottom="141"/>\n`;

    for (let r = 0; r < rows.length; r++) {
      xml += `          <hp:tr>\n`;
      for (let c = 0; c < rows[r].length; c++) {
        const cellText = escapeXml(rows[r][c]);
        // borderFillIDRef="2"를 "1"로 수정
        xml += `            <hp:tc borderFillIDRef="1" colSpan="1" rowSpan="1" colAddr="${c}" rowAddr="${r}" width="${colWidth}" height="1000">\n`;
        xml += `              <hp:subList>\n`;
        xml += `                <hp:p paraPrIDRef="0"><hp:run charPrIDRef="6"><hp:t>${cellText}</hp:t></hp:run></hp:p>\n`;
        xml += `              </hp:subList>\n`;
        xml += `            </hp:tc>\n`;
      }
      xml += `          </hp:tr>\n`;
    }
    
    xml += `        </hp:tbl>\n    </hp:p>`;
    
    return xml;
  }

  async function generateHWPX(md: string, title: string): Promise<Buffer> {
    const templatePath = path.join(process.cwd(), "public", "idea.hwpx");
    if (!fs.existsSync(templatePath)) {
      throw new Error("HWPX template (idea.hwpx) not found in public folder.");
    }

    const templateBuffer = fs.readFileSync(templatePath);
    
    // 1. 기존 ZIP(템플릿)을 그대로 로드하여 디렉터리 구조 및 메타데이터 완벽 보존
    const zip = await JSZip.loadAsync(templateBuffer);

    // 2. mimetype을 "STORE(무압축)" 방식으로 덮어쓰기 (HWPX 규격 필수)
    zip.file("mimetype", "application/hwp+zip", { compression: "STORE" });

    // 3. section0.xml 추출 및 수정
    const sectionFile = zip.file("Contents/section0.xml");
    if (!sectionFile) throw new Error("Contents/section0.xml not found in template.");
    
    const originalXml = await sectionFile.async("string");
    
    const secPrMatch = originalXml.match(/<hp:secPr[\s\S]*?<\/hp:secPr>/);
    const secPrXml = secPrMatch ? secPrMatch[0] : "";
    
    const rootTagMatch = originalXml.match(/<hs:sec[\s\S]*?>/);
    const rootTag = rootTagMatch ? rootTagMatch[0] : '<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">';

    // 윈도우 줄바꿈(CRLF)으로 인한 XML 파싱 오류 방지를 위해 전처리 강화
    let cleanMarkdown = md
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/【.*?】/g, '')
      .replace(/(\d+(?:-\d+)*\.)\s*\n\s*/g, '$1 ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const lines = cleanMarkdown.split('\n');
    const xmlBlocks: string[] = [];
    
    // [핵심] secPr 누락 완벽 방지
    // 변수 차단을 위해 문서 최상단에 보이지 않는 빈 문단을 하나 만들고 페이지 설정(secPr)을 박아둡니다.
    if (secPrXml) {
      xmlBlocks.push(`    <hp:p paraPrIDRef="0">\n      <hp:run charPrIDRef="6">${secPrXml}<hp:t></hp:t></hp:run>\n    </hp:p>`);
    }

    let inTable = false;
    let tableLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('|')) {
        inTable = true;
        tableLines.push(line);
      } else {
        if (inTable) {
          xmlBlocks.push(buildTable(tableLines));
          inTable = false;
          tableLines = [];
        }
        xmlBlocks.push(buildPara(line)); 
      }
    }
    if (inTable) xmlBlocks.push(buildTable(tableLines));

    const newParas = xmlBlocks.join('\n');
    const newSectionXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>\n${rootTag}\n${newParas}\n</hs:sec>`;
    
    // 4. 수정한 section0.xml을 원본 zip에 덮어쓰기
    zip.file("Contents/section0.xml", newSectionXml);

    // 5. 최종 HWPX 버퍼 생성
    return await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
  }

  // ===========================
  // API 엔드포인트 (외부 API 완전 제거)
  // ===========================
  app.post("/api/convert-to-hwpx", async (req, res) => {
    const { markdown, title } = req.body;
    if (!markdown) return res.status(400).json({ error: "Markdown content is required" });

    try {
      console.log("Generating HWPX locally with JSZip...");
      const buf = await generateHWPX(markdown, title || "document");
      res.setHeader('Content-Type', 'application/vnd.hancom.hwpx');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title || "document")}.hwpx"`);
      res.send(buf);
      console.log("HWPX generation successful, size:", buf.length);
    } catch (err: any) {
      console.error("HWPX generation error:", err);
      res.status(500).json({ error: "HWPX 생성 오류", details: err.message });
    }
  });

  // API Route: Parse File
  app.post("/api/parse-file", (req, res, next) => {
    console.log("Received POST request to /api/parse-file");
    next();
  }, upload.single("file"), async (req, res) => {
    try {
      console.log("Multer finished processing file");
      if (!req.file) {
        console.error("No file uploaded in request");
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Fix filename encoding (Multer uses latin1 by default)
      const originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const { mimetype, buffer } = req.file;
      const extension = path.extname(originalname).toLowerCase();
      
      // Check magic numbers for real file type detection
      const isPdfMagic = buffer.slice(0, 4).toString() === "%PDF";
      const isHwpMagic = buffer.slice(0, 8).equals(Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]));
      const isZipMagic = buffer.slice(0, 4).toString() === "PK\x03\x04";
      
      console.log(`Parsing file: ${originalname} (Mime: ${mimetype}, Ext: ${extension}, RealPDF: ${isPdfMagic}, RealHWP: ${isHwpMagic}, RealZip: ${isZipMagic})`);
      
      let text = "";

      // 1. PDF Handling
      if (isPdfMagic || mimetype === "application/pdf" || extension === ".pdf") {
        if (!isPdfMagic && (isHwpMagic || extension === ".hwp")) {
          return res.status(400).json({ 
            error: `한글(HWP) 파일이 PDF로 확장자만 변경된 것 같습니다. (${originalname}) 한글 프로그램에서 'PDF로 저장하기' 기능을 이용해 정상적인 PDF로 변환 후 업로드해주세요.` 
          });
        }

        try {
          // Extremely defensive PDF parser function retrieval
          let parsePdf = pdf;
          if (typeof parsePdf !== 'function' && (pdf as any).default) {
            parsePdf = (pdf as any).default;
          }
          
          console.log(`Using PDF parser function: ${typeof parsePdf}`);
          
          if (typeof parsePdf !== 'function') {
            // Try one more time with require
            const freshPdf = require("pdf-parse");
            parsePdf = typeof freshPdf === 'function' ? freshPdf : freshPdf.default;
          }

          if (typeof parsePdf !== 'function') {
            throw new Error("PDF 분석 라이브러리를 로드할 수 없습니다. (Not a function)");
          }

          const data = await parsePdf(buffer);
          text = data.text;
          console.log(`Successfully parsed PDF: ${originalname}`);
        } catch (pdfError) {
          console.error(`PDF parsing error for ${originalname}:`, pdfError);
          const errorMsg = pdfError instanceof Error ? pdfError.message : String(pdfError);
          return res.status(400).json({ 
            error: `PDF 분석 실패: ${originalname}. 파일이 암호화되어 있거나 특수한 보안(DRM)이 걸려있을 수 있습니다. 일반적인 PDF로 다시 저장하여 시도해 보세요. (상세: ${errorMsg.substring(0, 50)})` 
          });
        }
      } 
      // 2. DOCX Handling
      else if (
        mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
        extension === ".docx"
      ) {
        try {
          const result = await mammoth.extractRawText({ buffer });
          text = result.value;
          console.log(`Successfully parsed DOCX: ${originalname}`);
        } catch (docxError) {
          console.error(`DOCX parsing error for ${originalname}:`, docxError);
          return res.status(400).json({ error: `DOCX 파일을 분석할 수 없습니다. (${originalname})` });
        }
      } 
      // 3. Text Handling
      else if (mimetype === "text/plain" || extension === ".txt") {
        text = buffer.toString("utf-8");
        console.log(`Successfully read text file: ${originalname}`);
      } 
      // 4. HWP/HWPX Handling
      else if (
        isHwpMagic ||
        isZipMagic ||
        mimetype === "application/x-hwp" || 
        mimetype === "application/vnd.hancom.hwpx" || 
        extension === ".hwp" || 
        extension === ".hwpx"
      ) {
        try {
          // Check if it's actually an HWPX (ZIP) even if extension is .hwp
          if (isZipMagic || extension === ".hwpx" || mimetype === "application/vnd.hancom.hwpx") {
            console.log(`Parsing HWPX (or ZIP-based HWP): ${originalname}`);
            const zip = new AdmZip(buffer);
            const entries = zip.getEntries();
            let fullText = "";
            
            // HWPX content is usually in Contents/sectionN.xml
            const sectionEntries = entries
              .filter(e => e.entryName.match(/^Contents\/section\d+\.xml$/))
              .sort((a, b) => {
                const aNum = parseInt(a.entryName.match(/\d+/)?.[0] || "0");
                const bNum = parseInt(b.entryName.match(/\d+/)?.[0] || "0");
                return aNum - bNum;
              });
              
            if (sectionEntries.length === 0) {
              // Try to find any XML in Contents if section matches fail
              const altEntries = entries.filter(e => e.entryName.startsWith("Contents/") && e.entryName.endsWith(".xml"));
              sectionEntries.push(...altEntries);
            }

            for (const entry of sectionEntries) {
              const xml = entry.getData().toString('utf8');
              try {
                const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
                const result = await parser.parseStringPromise(xml);
                
                // Recursive function to extract text from HWPX XML
                const extractText = (obj: any): string => {
                  if (!obj) return "";
                  if (typeof obj === 'string') return obj;
                  if (Array.isArray(obj)) return obj.map(extractText).join("");
                  
                  let t = "";
                  // HWPX text tag is hp:t
                  if (obj['hp:t']) {
                    const val = obj['hp:t'];
                    t += typeof val === 'string' ? val : (val._ || extractText(val));
                  }
                  
                  // Process children
                  for (const key in obj) {
                    if (key !== 'hp:t' && typeof obj[key] === 'object') {
                      t += extractText(obj[key]);
                    }
                  }
                  return t;
                };

                const sectionText = extractText(result);
                if (sectionText) {
                  fullText += sectionText + "\n";
                } else {
                  // Fallback to regex if recursive extraction yields nothing
                  const matches = xml.match(/<hp:t.*?>(.*?)<\/hp:t>/g);
                  if (matches) {
                    fullText += matches
                      .map(m => m.replace(/<hp:t.*?>|<\/hp:t>/g, ''))
                      .join('') + "\n";
                  }
                }
              } catch (xmlError) {
                console.warn(`Failed to parse XML entry ${entry.entryName}, falling back to regex:`, xmlError);
                const matches = xml.match(/<hp:t.*?>(.*?)<\/hp:t>/g);
                if (matches) {
                  fullText += matches
                    .map(m => m.replace(/<hp:t.*?>|<\/hp:t>/g, ''))
                    .join('') + "\n";
                }
              }
            }
            text = fullText;
            console.log(`Successfully parsed HWPX/ZIP: ${originalname}`);
          } else {
            console.log(`Parsing HWP (OLE): ${originalname}`);
            const hwp = new HWP(buffer);
            text = hwp.getText();
            console.log(`Successfully parsed HWP: ${originalname}`);
          }
        } catch (hwpError) {
          console.error(`HWP/HWPX parsing error for ${originalname}:`, hwpError);
          return res.status(400).json({ 
            error: `한글 파일(HWP/HWPX) 분석 중 오류가 발생했습니다. (${originalname}) 파일이 너무 최신 버전이거나 암호화되어 있을 수 있습니다. PDF로 변환하여 업로드해주시면 더 정확한 분석이 가능합니다.` 
          });
        }
      } 
      else {
        return res.status(400).json({ 
          error: `지원하지 않는 파일 형식입니다. PDF, DOCX, TXT 파일만 지원합니다. (${originalname})` 
        });
      }

      if (!text || text.trim().length === 0) {
        console.warn(`Extracted text is empty for file: ${originalname}`);
        // If text is empty but it's a valid PDF, it might be a scanned image PDF
        if (isPdfMagic) {
          return res.status(400).json({
            error: `파일(${originalname})에서 텍스트를 추출할 수 없습니다. 스캔된 이미지 형태의 PDF인 경우 텍스트 분석이 불가능합니다. 텍스트가 포함된 문서를 업로드해주세요.`
          });
        }
      }

      res.json({ text });
    } catch (error) {
      console.error("General parsing error:", error);
      res.status(500).json({ error: "서버 내부 오류로 파일을 분석하지 못했습니다." });
    }
  });

  // Error handler for API routes
  app.use("/api", (err: any, req: any, res: any, next: any) => {
    console.error("API Error:", err);
    res.status(err.status || 500).json({ 
      error: err.message || "Internal Server Error",
      details: process.env.NODE_ENV !== "production" ? err.stack : undefined
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
