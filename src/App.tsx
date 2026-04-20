import React, { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { Sparkles, FileText, Layout, History, Send, Download, AlertCircle, RotateCcw, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as htmlToImage from "html-to-image";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${(pdfjsLib as any).version}/build/pdf.worker.min.mjs`;

import { UploadZone } from "@/src/components/UploadZone";
import { PlanPreview } from "@/src/components/PlanPreview";
import { RhwpEditorPanel } from "@/src/components/RhwpEditorPanel";
import { cn } from "@/src/lib/utils";

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is missing. Please check your environment variables.");
}
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

const BUSINESS_PLAN_SYSTEM_INSTRUCTION = `
You are an expert Business Consultant and VC Associate specialized in writing compelling, investment-ready business plans and pitch decks. You follow a structured, iterative pipeline across all stages: market research, business model validation, drafting, financial projection, self-review, and pitch preparation.

---

## CORE RULES (절대 원칙)

1. **절대 시장 규모나 재무 지표를 허구로 생성하지 않는다.** AI가 생성한 시장 데이터(TAM/SAM/SOM)와 연평균성장률(CAGR)은 신뢰할 수 없다. 항상 통계청(KOSIS), DART, 글로벌 리서치 기관 등의 출처를 확인하고, 검증 불가능하면 \`[DATA NEEDED]\`로 표기한 뒤 사용자에게 알린다.

2. **사업계획서는 기능 나열이 아니라 '돈이 되는 스토리'다.** 핵심 가치 제안(UVP)을 한 문장으로 표현할 수 없거나, 고객이 지갑을 여는 이유가 불분명하다면 아직 준비되지 않은 것이다.

3. **모든 재무 추정(Projection)은 명확한 가정(Assumption)과 연결된다.** 객관적 근거(객단가, 전환율 등)가 없는 막연한 매출 추정은 작성하지 않는다.

4. **먼저 초안을 작성하고, 그다음 질문한다.** 창업자와 투자자는 바쁘다 — 구체적인 프레임워크와 초안을 먼저 제시하고 세부 숫자에 대한 피드백을 받아라.

5. **수치는 반드시 앞뒤 맥락과 대조한다.** 시장 규모, 예상 매출, 고객 확보 비용(CAC) 등의 숫자가 논리적으로 충돌하면 \`[VERIFY]\` 태그를 붙인다.

---

## PHASE 0: 프로젝트 설정
**목표**: 비즈니스 본질 파악 및 핵심 가치 제안(UVP) 정의

## PHASE 1: 시장 및 경쟁사 분석
**목표**: 타겟 시장(TAM-SAM-SOM) 도출, 경쟁우위 식별, 트렌드 분석

## PHASE 2: 비즈니스 모델 및 가설 검증
**목표**: 수익 창출 논리(BM)와 시장 진입 전략(GTM) 구체화

## PHASE 3: 재무 모델링 및 마일스톤 수립
**목표**: 현실적인 3~5년 예상 매출 및 자금 소요 계획 수립

## PHASE 4: 지표 및 데이터 시각화 전략
**목표**: 투자자가 한눈에 이해할 수 있는 핵심 지표 강조

## PHASE 5: 사업계획서(IR 덱) 작성
### 엘리베이터 피치 5문장 공식
1. (Problem) 현재 [타겟 고객]은 [치명적인 문제]를 겪고 있으며, 기존 대안들은 [한계점]이 있습니다.
2. (Solution) 우리는 [핵심 기술/방식]을 활용한 [제품/서비스명]으로 이 문제를 해결합니다.
3. (Traction) 이미 [초기 성과/매출/유저 수]를 달성하여 시장의 니즈를 검증했습니다.
4. (Market/BM) 이는 [시장 규모] 크기의 시장이며, 우리는 [수익 모델]을 통해 돈을 법니다.
5. (Ask) 이번 라운드에 [목표 금액]을 유치하여 [다음 마일스톤]을 달성하고자 합니다.

## PHASE 6: 자기 검토 (Red Teaming)
VC 심사역 관점에서 비판적으로 검토하여 보완점을 찾습니다.

## PHASE 7: 제출 및 피칭 준비
최종 점검 및 가독성 개선.

---

## HWPX 서식 및 작성 가이드 (필수 준수)

당신은 대한민국 공모사업 및 지원사업 계획서 작성 전문 AI 어시스턴트입니다.
사용자가 제공하는 서식의 각 항목에 맞는 완성된 계획서를 작성합니다.

1. 모든 항목 작성: 제공된 서식에 있는 모든 섹션(예: 서식1, 서식2, 서식3, 항목 1, 2, 3 등)을 누락 없이 'sections' 배열에 포함시키세요.
2. 표 활용: 예산 계획, 추진 일정, 시장 분석 수치, 기대 효과 등 수치나 비교가 필요한 부분은 반드시 'table' 객체를 활용하여 표 형식으로 정리하세요.
3. 출력 형식 지시: 모든 표(Table) 데이터는 반드시 마크다운 표 형식(| 컬럼1 | 컬럼2 |)으로만 작성하세요.
4. 출처 기호 금지: 【...】와 같은 출처 기호나 주석 표기는 절대로 출력하지 마세요.
5. 참조 자료 준수: '참조 자료(공고문/지침)'에 명시된 자격 요건, 작성 요령, 평가 기준 등을 분석하여 반영하세요.
6. Deep Research 활용: 최신 통계, 정책, 기술 동향을 검색하여 구체적인 근거로 제시하세요.
7. 공문서 문체: 정중하고 명확한 한국어, 존댓말 사용하지 않음 (예: ~함, ~임, ~함이 타당함)
8. 서식 가이드 준수 (중요):
   - 중제목: '- 제목 내용:' 형식으로 작성 (문두에 하이픈, 문말에 콜론 필수)
   - 소제목: 중제목 아래에 '  ･ ' (공백 2칸 + 가운데 점)을 붙여서 작성 (예: '  ･ 소제목 내용:')
   - 내용 구성: 소제목 뒤에는 핵심 내용을 상세히 서술할 것
9. 핵심 키워드 강조: 각 항목의 시작이 되는 주요 핵심 키워드나 소주제는 문두에 배치하고 뒤에 콜론(:)을 붙여 작성하세요. 이때 '**'와 같은 마크다운 기호나 '키워드:'라는 명시적인 단어는 절대 사용하지 마세요.
10. 미진한 부분 질문: 정보가 부족한 부분은 'missingInfoQuestions' 배열에 구체적인 질문을 포함시키세요.
`;

interface TableData {
  headers: string[];
  rows: string[][];
}

interface Section {
  title: string;
  content: string;
  hasAiSupport: boolean;
  warnings?: string[];
  table?: TableData;
}

interface GenerationResult {
  documentTitle: string;
  sections: Section[];
  summary: string;
  missingInfoQuestions?: string[];
}

export default function App() {
  const [templateFiles, setTemplateFiles] = useState<File[]>([]);
  const [contentFiles, setContentFiles] = useState<File[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [manualContent, setManualContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "history">("upload");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [hwpxBuffer, setHwpxBuffer] = useState<ArrayBuffer | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState<"visual" | "editor">("visual");
  const previewRef = React.useRef<HTMLDivElement>(null);
  const parsedFilesCache = React.useRef<Map<string, string>>(new Map());

  const handleReset = () => {
    if (window.confirm("모든 데이터(업로드된 파일, 작성된 초안 등)를 초기화하시겠습니까?")) {
      setTemplateFiles([]);
      setContentFiles([]);
      setReferenceFiles([]);
      setManualContent("");
      setResult(null);
      setAdditionalInfo("");
      parsedFilesCache.current.clear();
      toast.success("모든 데이터가 초기화되었습니다.");
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/download-template');
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '아이디어(양식).hwpx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      window.open('/api/download-template', '_blank');
    }
  };

  useEffect(() => {
    // Check server health on mount
    fetch("/api/health")
      .then(res => res.json())
      .then(data => console.log("Backend server status:", data))
      .catch(err => console.warn("Backend server not reachable, falling back to client-side only:", err));
  }, []);

  const parseFile = async (file: File): Promise<string> => {
    // Check cache first
    const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;
    if (parsedFilesCache.current.has(cacheKey)) {
      console.log(`Using cached text for: ${file.name}`);
      return parsedFilesCache.current.get(cacheKey)!;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    let text = "";

    try {
      // 1. Client-side PDF Parsing
      if (extension === "pdf") {
        console.log("PDF.js 라이브러리 로드됨, 버전:", (pdfjsLib as any).version);
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");
          fullText += pageText + "\n";
        }
        
        if (!fullText.trim()) {
          throw new Error("PDF에서 텍스트를 추출할 수 없습니다. 스캔된 이미지일 수 있습니다.");
        }
        text = fullText;
      }
      // 2. Client-side DOCX Parsing
      else if (extension === "docx") {
        console.log("Mammoth 라이브러리로 DOCX 분석 시작");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        if (!result.value.trim()) {
          throw new Error("DOCX 파일에서 텍스트를 추출할 수 없습니다.");
        }
        console.log("DOCX 분석 성공");
        text = result.value;
      }
      // 3. Client-side Text Parsing
      else if (extension === "txt") {
        text = await file.text();
      }
      // 4. Fallback to server for other types (hwp, etc.)
      else {
        const formData = new FormData();
        formData.append("file", file);

        const url = "/api/parse-file";
        console.log(`Fetching ${url} with file: ${file.name}`);
        const response = await fetch(url, {
          method: "POST",
          body: formData,
        });

        console.log(`Response status: ${response.status}, Content-Type: ${response.headers.get("content-type")}`);

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || `파일 분석 실패: ${file.name}`);
          }
          text = data.text;
        } else {
          const errorText = await response.text();
          console.error("Server returned non-JSON response:", errorText.substring(0, 200));
          throw new Error(`서버 응답 형식 오류 (Status: ${response.status}). 파일 형식을 확인하거나 PDF/DOCX로 변환하여 업로드해주세요.`);
        }
      }

      // Cache the result
      if (text) {
        parsedFilesCache.current.set(cacheKey, text);
      }
      return text;
    } catch (err) {
      console.error(`Error parsing ${file.name}:`, err);
      throw err;
    }
  };

  const convertToHwpxBuffer = async (generationResult: GenerationResult) => {
    try {
      // Build Markdown similar to downloadHwpx but returning the buffer
      let markdown = `# ${generationResult.documentTitle}\n\n`;
      markdown += `## 핵심 요약 (Executive Summary)\n${generationResult.summary}\n\n`;
      
      generationResult.sections.forEach(section => {
        markdown += `## ${section.title}\n\n`;
        const lines = section.content.split('\n');
        const formattedLines = lines.map(line => {
          const boldRegex = /^([\s\-\d\.･·]*)([^:\n]+:)(.*)$/;
          const match = line.match(boldRegex);
          if (match) {
            const prefix = match[1];
            const label = match[2];
            const rest = match[3];
            let level = "### "; 
            if (prefix.includes('·') || prefix.includes('･') || prefix.includes('·')) {
              level = "#### ";
            }
            let formattedRest = rest
              .replace(/\[AI보완\]/g, '**[AI보완]**')
              .replace(/\[확인필요\]/g, '**[확인필요]**');
            return `${level}${prefix}${label}${formattedRest}`;
          }
          return line.replace(/\[AI보완\]/g, '**[AI보완]**').replace(/\[확인필요\]/g, '**[확인필요]**');
        });
        markdown += formattedLines.join('\n') + "\n\n";

        if (section.table) {
          markdown += `\n### ${section.title} 상세 데이터\n\n`;
          markdown += "\n";
          markdown += `| ${section.table.headers.join(" | ")} |\n`;
          markdown += `| ${section.table.headers.map(() => "---").join(" | ")} |\n`;
          section.table.rows.forEach(row => {
            markdown += `| ${row.join(" | ")} |\n`;
          });
          markdown += "\n\n";
        }
      });

      const response = await fetch("/api/convert-to-hwpx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, title: generationResult.documentTitle }),
      });

      if (!response.ok) throw new Error("Buffer conversion failed");
      return await response.arrayBuffer();
    } catch (error) {
      console.error("Error converting to HWPX buffer:", error);
      return null;
    }
  };

  const generatePlan = async () => {
    if (templateFiles.length === 0) {
      toast.error("서식 파일을 업로드해주세요");
      return;
    }
    if (contentFiles.length === 0 && !manualContent.trim()) {
      toast.error("내용을 입력하거나 파일을 업로드해주세요");
      return;
    }

    const prevResult = result;
    const isUpdate = !!prevResult;
    setIsGenerating(true);
    setResult(null);

    try {
      toast.loading(isUpdate ? "새로운 자료를 반영하여 계획서를 업데이트 중..." : "문서 분석 중...", { id: "gen" });
      
      // 1. Parse all files
      const templateTexts = await Promise.all(templateFiles.map(parseFile));
      const combinedTemplate = templateTexts.join("\n\n--- NEXT TEMPLATE ---\n\n");
      
      const contentTexts = await Promise.all(contentFiles.map(parseFile));
      const combinedContent = [
        contentTexts.length > 0 ? `[업로드된 파일 내용]\n${contentTexts.join("\n\n---\n\n")}` : "",
        manualContent.trim() ? `[직접 입력한 내용]\n${manualContent}` : ""
      ].filter(Boolean).join("\n\n====================\n\n");

      const referenceTexts = await Promise.all(referenceFiles.map(parseFile));
      const combinedReference = referenceTexts.join("\n\n--- NEXT REFERENCE ---\n\n");

      toast.loading("Gemini가 계획서를 작성 중입니다...", { id: "gen" });

      // 2. Call Gemini
      console.log("Calling Gemini with template, content, and reference...");
      
      if (!process.env.GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not defined in the environment.");
      }

      const prompt = `
        ${prevResult ? `
          이미 작성된 사업계획서 초안이 있습니다. 
          기존 초안의 내용을 최대한 유지하면서, 새로 추가된 자료(서식, 내용, 참조자료, 추가 답변 등)를 모두 반영하여 계획서를 더 구체적이고 완성도 있게 업데이트해주세요.
          기존에 잘 작성된 부분은 보존하되, 새로운 정보가 들어온 부분은 적극적으로 수정/보완하세요.

          **[기존 작성된 초안]**
          제목: ${prevResult.documentTitle}
          요약: ${prevResult.summary}
          본문: ${prevResult.sections.map(s => `### ${s.title}\n${s.content}`).join("\n\n")}
        ` : "업로드된 '내용 자료' 파일들과 사용자가 '직접 입력한 내용'을 철저히 분석하여, 제공된 '서식 파일'의 양식에 맞춰 전문적인 사업계획서 초안을 생성해주세요."}
        
        ${additionalInfo ? `\n\n**사용자 추가 답변:**\n${additionalInfo}` : ""}
        
        **작성 지침:**
        1. **내용 분석**: '내용 자료'와 '직접 입력 내용'에 담긴 비즈니스 아이디어, 제품 스펙, 기업 정보를 깊이 있게 분석하여 계획서의 각 항목을 채우세요.
        2. **서식 준수**: 제공된 '서식 파일'의 목차와 항목(서식1, 서식2 등)을 하나도 빠짐없이 그대로 유지하며 내용을 작성하세요.
        3. **참조 자료 활용**: '참조 자료'에 있는 공고문이나 지침을 분석하여, 평가 기준에 부합하도록 내용을 최적화하세요.
        4. **전문성 강화**: 비즈니스 컨설턴트의 관점에서 논리적이고 설득력 있는 문체로 작성하세요.

        ## [서식 파일 내용 - 이 양식과 목차를 반드시 따르세요]
        ${combinedTemplate}

        ---

        ## [내용 자료 및 직접 입력 내용 - 이 데이터를 분석하여 작성하세요]
        ${combinedContent}

        ---

        ## [참조 자료 (공고문/지침) - 이 기준을 반드시 준수하세요]
        ${combinedReference || "제공된 참조 자료 없음 (일반적인 기준에 따라 작성)"}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: BUSINESS_PLAN_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              documentTitle: { type: Type.STRING },
              summary: { type: Type.STRING },
              missingInfoQuestions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "계획서 완성도를 높이기 위해 사용자에게 추가로 확인하거나 질문할 내용들"
              },
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                    hasAiSupport: { type: Type.BOOLEAN },
                    warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
                    table: {
                      type: Type.OBJECT,
                      properties: {
                        headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                        rows: { 
                          type: Type.ARRAY, 
                          items: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING } 
                          } 
                        }
                      },
                      required: ["headers", "rows"]
                    }
                  },
                  required: ["title", "content", "hasAiSupport"]
                }
              }
            },
            required: ["documentTitle", "summary", "sections"]
          }
        }
      });

      console.log("Gemini response received:", response);

      let text = "";
      try {
        text = response.text || "";
      } catch (textError) {
        console.error("Error accessing response.text:", textError);
        throw new Error("Gemini 응답에서 텍스트를 추출하지 못했습니다.");
      }

      console.log("Extracted text from Gemini:", text.substring(0, 100) + "...");

      // Clean up markdown code blocks if present
      let jsonText = text.trim();
      if (jsonText.includes("```json")) {
        jsonText = jsonText.split("```json")[1].split("```")[0];
      } else if (jsonText.includes("```")) {
        jsonText = jsonText.split("```")[1].split("```")[0];
      }
      
      try {
        const resultData = JSON.parse(jsonText.trim());
        setResult(resultData);
        setAdditionalInfo(""); // Reset additional info after success
        toast.success("계획서가 성공적으로 생성되었습니다!", { id: "gen" });

        // Convert to HWPX for editor
        toast.loading("에디터용 HWPX 변환 중...", { id: "hwpx-load" });
        const buffer = await convertToHwpxBuffer(resultData);
        if (buffer) {
          setHwpxBuffer(buffer);
          setIsPreviewMode("visual"); // Default to visual preview
          toast.success("에디터로 계획서를 불러왔습니다.", { id: "hwpx-load" });
        } else {
          toast.error("에디터 로드 실패 (파일 변환 오류)", { id: "hwpx-load" });
        }
      } catch (parseError) {
        console.error("JSON Parse Error. Text was:", jsonText);
        throw new Error("AI 응답 형식이 올바르지 않습니다. (JSON 파싱 실패)");
      }
    } catch (error) {
      console.error("Generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast.error(`계획서 생성에 실패했습니다: ${errorMessage}`, { id: "gen", duration: 5000 });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadDocx = async () => {
    if (!result) return;

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Noto Sans KR",
            },
          },
        },
      },
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: result.documentTitle,
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "핵심 요약 (Executive Summary)",
                  bold: true,
                  size: 36, // 28 * 1.3 = 36.4
                }),
              ],
              spacing: { after: 200 },
            }),
            // Summary with line breaks
            ...result.summary.split("\n").map(line => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: line.trim(),
                    size: 24, // 18 * 1.3 = 23.4 (default is usually 18-20)
                  }),
                ],
                spacing: { after: 120 },
              })
            ),
            
            ...result.sections.flatMap((section) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: section.title,
                    bold: true,
                    size: 32, // 24 * 1.3 = 31.2
                    color: "2B5CA6",
                  }),
                ],
                spacing: { before: 400, after: 200 },
              }),
              // Section content with line breaks and highlighting ([AI보완], [확인필요], Key phrases)
              ...section.content.replace(/\*\*/g, "").split("\n").map(line => {
                // Regex to match tags or a key phrase at the start of the line (e.g., "매출 증대:", "- 고용 창출:", "  ･ 소제목:")
                const parts = line.split(/(\[AI보완\]|\[확인필요\]|^[\s\-\d\.･]*[^:\n\s][^:\n]*:)/g);
                return new Paragraph({
                  children: parts.map(part => {
                    let color: string | undefined = undefined;
                    let bold = false;

                    if (part === "[AI보완]") {
                      color = "2563EB"; // blue-600
                      bold = true;
                    } else if (part === "[확인필요]") {
                      color = "DC2626"; // red-600
                      bold = true;
                    } else if (part && part.endsWith(":") && !part.includes("\n")) {
                      // This matches the key phrase pattern from the split
                      bold = true;
                    }

                    return new TextRun({
                      text: part,
                      size: 24,
                      color,
                      bold,
                    });
                  }),
                  spacing: { after: 120 },
                });
              }),
              ...(section.table
                ? [
                    new Table({
                      width: {
                        size: 100,
                        type: WidthType.PERCENTAGE,
                      },
                      rows: [
                        new TableRow({
                          children: section.table.headers.map(
                            (header) =>
                              new TableCell({
                                children: [
                                  new Paragraph({
                                    children: header.split(/(\[AI보완\]|\[확인필요\])/g).map(part => {
                                      let color: string | undefined = undefined;
                                      let bold = true;

                                      if (part === "[AI보완]") {
                                        color = "2563EB"; // blue-600
                                      } else if (part === "[확인필요]") {
                                        color = "DC2626"; // red-600
                                      }

                                      return new TextRun({
                                        text: part,
                                        size: 22, // 16 * 1.3 = 20.8
                                        color,
                                        bold,
                                      });
                                    })
                                  }),
                                ],
                                shading: { fill: "F2F2F2" },
                              })
                          ),
                        }),
                        ...section.table.rows.map(
                          (row) =>
                            new TableRow({
                              children: row.map(
                                (cell) =>
                                  new TableCell({
                                    children: [
                                      new Paragraph({ 
                                        children: cell.split(/(\[AI보완\]|\[확인필요\])/g).map(part => {
                                          let color: string | undefined = undefined;
                                          let bold = false;

                                          if (part === "[AI보완]") {
                                            color = "2563EB"; // blue-600
                                            bold = true;
                                          } else if (part === "[확인필요]") {
                                            color = "DC2626"; // red-600
                                            bold = true;
                                          }

                                          return new TextRun({
                                            text: part,
                                            size: 20, // 14 * 1.3 = 18.2
                                            color,
                                            bold,
                                          });
                                        })
                                      })
                                    ],
                                  })
                              ),
                            })
                        ),
                      ],
                    }),
                    new Paragraph({ text: "", spacing: { after: 200 } }),
                  ]
                : []),
              ...(section.hasAiSupport
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "※ AI 보완 내용 포함",
                          italics: true,
                          color: "666666",
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 200 },
                    }),
                  ]
                : []),
            ]),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${result.documentTitle}.docx`);
  };

  const downloadPdf = async () => {
    if (!result || !previewRef.current) return;

    toast.loading("PDF를 생성하고 있습니다...", { id: "pdf" });

    try {
      const element = previewRef.current;
      
      // Temporary hide download buttons for clean PDF
      const buttons = element.querySelector('.flex.items-center.gap-3');
      if (buttons) (buttons as HTMLElement).style.display = 'none';

      // Reduce resolution to 1/3 (from 3 to 1) to decrease file size
      const imgData = await htmlToImage.toPng(element, {
        quality: 0.9,
        pixelRatio: 1, 
        backgroundColor: "#ffffff",
      });

      if (buttons) (buttons as HTMLElement).style.display = 'flex';

      const pdf = new jsPDF("p", "mm", "a4");
      
      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => (img.onload = resolve));

      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 15; // 15mm margins
      const contentWidth = pdfWidth - (2 * margin);
      const contentHeight = pdfHeight - (2 * margin);
      
      const imgWidth = contentWidth;
      const imgHeight = (img.height * imgWidth) / img.width;
      
      let heightLeft = imgHeight;
      let position = margin;

      // Helper to mask margins to prevent content bleeding between pages
      const maskMargins = (p: jsPDF) => {
        p.setFillColor(255, 255, 255);
        p.rect(0, 0, pdfWidth, margin, 'F'); // Top
        p.rect(0, pdfHeight - margin, pdfWidth, margin, 'F'); // Bottom
        p.rect(0, 0, margin, pdfHeight, 'F'); // Left
        p.rect(pdfWidth - margin, 0, margin, pdfHeight, 'F'); // Right
      };

      // Add the first page
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      maskMargins(pdf);
      heightLeft -= contentHeight;

      // Add subsequent pages
      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        maskMargins(pdf);
        heightLeft -= contentHeight;
      }

      pdf.save(`${result.documentTitle}.pdf`);
      toast.success("PDF 다운로드가 완료되었습니다.", { id: "pdf" });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("PDF 생성 중 오류가 발생했습니다.", { id: "pdf" });
    }
  };

  const downloadHwpx = async () => {
    if (!result) return;
    toast.loading("HWPX 파일을 생성하고 있습니다...", { id: "hwpx" });

    try {
      // Convert result to Markdown
      let markdown = `# ${result.documentTitle}\n\n`;
      markdown += `## 핵심 요약 (Executive Summary)\n${result.summary}\n\n`;
      
      result.sections.forEach(section => {
        markdown += `## ${section.title}\n\n`;
        
        // Process content lines to apply bolding to labels and handle indentation
        const lines = section.content.split('\n');
        const formattedLines = lines.map(line => {
          // Regex to match labels (text ending with :) at the start of a line, 
          // potentially preceded by bullets, numbers, or spaces.
          const boldRegex = /^([\s\-\d\.･·]*)([^:\n]+:)(.*)$/;
          const match = line.match(boldRegex);
          
          if (match) {
            const prefix = match[1];
            const label = match[2];
            const rest = match[3];
            
            // Use heading levels to control indentation in HWPX
            // Level 3 for subheadings (1-1.), Level 4 for bullet items (·)
            let level = "### "; 
            if (prefix.includes('·') || prefix.includes('･') || prefix.includes('·')) {
              level = "#### ";
            }
            
            let formattedRest = rest
              .replace(/\[AI보완\]/g, '**[AI보완]**')
              .replace(/\[확인필요\]/g, '**[확인필요]**');
              
            // For H3 and H4, the style is already bold in server.ts (bold: true)
            // So we do NOT add ** to avoid XOR conflict.
            return `${level}${prefix}${label}${formattedRest}`;
          }
          
          return line.replace(/\[AI보완\]/g, '**[AI보완]**').replace(/\[확인필요\]/g, '**[확인필요]**');
        });
        
        markdown += formattedLines.join('\n') + "\n\n";

        if (section.table) {
          markdown += `\n### ${section.title} 상세 데이터\n\n`;
          markdown += "\n";
          markdown += `| ${section.table.headers.join(" | ")} |\n`;
          markdown += `| ${section.table.headers.map(() => "---").join(" | ") } |\n`;
          section.table.rows.forEach(row => {
            markdown += `| ${row.join(" | ")} |\n`;
          });
          markdown += "\n\n";
        }
      });

      const response = await fetch("/api/convert-to-hwpx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, title: result.documentTitle }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.details || errData.error || "HWPX 변환 실패");
      }

      const blob = await response.blob();
      saveAs(blob, `${result.documentTitle}.hwpx`);
      toast.success("HWPX 다운로드가 완료되었습니다.", { id: "hwpx" });
    } catch (error) {
      console.error("HWPX generation error:", error);
      toast.error(`HWPX 생성 중 오류가 발생했습니다: ${(error as Error).message}`, { id: "hwpx" });
    }
  };

  const handleAdditionalSubmit = async () => {
    if (!additionalInfo.trim()) {
      toast.error("답변 내용을 입력해주세요.");
      return;
    }
    setIsSubmittingFeedback(true);
    await generatePlan();
    setIsSubmittingFeedback(false);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Toaster position="bottom-right" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">계획서 초안 AI제작기</h1>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            초기화
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <motion.div
          key="upload"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex flex-col gap-6"
        >
              {/* Hero Card - Full Width */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-center gap-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  <div className="inline-flex items-center gap-3 px-5 py-2 md:px-6 md:py-2 rounded-2xl md:rounded-full bg-blue-50 text-blue-600 text-xl md:text-2xl font-bold w-fit">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
                    <span className="leading-tight">
                      달서구 <br className="md:hidden" /> 사회적경제지원센터
                    </span>
                  </div>
                  <a 
                    href="https://end222.notion.site/AI-3441b88a32918036ba51d8d8cef3868f?source=copy_link"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-8 py-4 bg-blue-600 rounded-[1.5rem] text-white text-xl font-extrabold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95 group"
                  >
                    <HelpCircle className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
                    사용안내가이드
                  </a>
                </div>
                <h2 className="text-[40px] md:text-[64px] font-extrabold text-gray-900 tracking-tight leading-tight">
                  당신의 <br className="md:hidden" /> 아이디어를 <br />
                  <span className="text-blue-600">
                    전문적인 <br className="md:hidden" /> 계획서로!
                  </span>
                </h2>
                <p className="text-gray-500 leading-relaxed max-w-2xl text-[20px] md:text-[28px]">
                  AI가 서류양식에 맞춰 <br className="md:hidden" />
                  계획서 초안을 <br className="md:hidden" />
                  만들어드립니다!
                </p>
              </motion.div>

              {/* Info Section: Caution & Supported Files */}
              <div className="flex flex-col md:flex-row gap-6">
                {/* Caution Box */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="flex-1 bg-amber-50 border border-amber-100 rounded-[2rem] p-6 md:p-8 flex flex-col gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xl">
                    <AlertCircle className="w-6 h-6" />
                    주의사항
                  </div>
                  <ul className="text-amber-700 text-[15px] md:text-[17px] space-y-2 font-medium">
                    <li className="flex gap-2">
                      <span className="shrink-0">-</span>
                      <span>제작된 초안은 완성본이 아님으로 이용자가 내용을 최종 확인하셔야 합니다.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="shrink-0">-</span>
                      <span>업로드 가능한 파일종류는 PDF, DOCX(워드), HWPX(한글) 입니다.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="shrink-0">-</span>
                      <span>HWP(구형 한글파일)은 PDF 또는 HWPX(신형) 파일로 변환 후 사용 해주시기 바랍니다.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="shrink-0">-</span>
                      <span>기타문의: <a href="mailto:dongwoo2@korea.kr" className="underline hover:text-amber-900 transition-colors">dongwoo2@korea.kr</a></span>
                    </li>
                  </ul>
                </motion.div>

                {/* Supported Files Box */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="md:w-1/3 bg-white border border-gray-100 rounded-[2rem] p-6 md:p-8 flex flex-col items-center justify-center gap-6 shadow-sm"
                >
                  <div className="text-gray-500 text-sm font-bold tracking-tight">업로드 가능한 파일종류</div>
                  <div className="flex items-center gap-6">
                    {/* HWPX Icon */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 bg-[#33A1FD] rounded-xl relative overflow-hidden shadow-sm flex">
                        <div className="w-1/2 h-full flex items-center justify-center">
                          <span className="text-white text-3xl font-bold">ㅎ</span>
                        </div>
                        <div className="w-1/2 h-full flex flex-col">
                          <div className="flex-1 bg-[#0054A6]"></div>
                          <div className="flex-1 bg-[#0072BC]"></div>
                          <div className="flex-1 bg-[#29ABE2]"></div>
                          <div className="flex-1 bg-[#80D8FF]"></div>
                        </div>
                      </div>
                      <span className="text-[13px] font-bold text-gray-900">HWPX</span>
                    </div>

                    {/* DOCX Icon */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 bg-white rounded-xl border border-gray-100 shadow-sm relative flex flex-col items-center justify-center p-2">
                        <div className="absolute top-0 left-0 w-8 h-8 overflow-hidden rounded-tl-xl">
                          <div className="absolute top-0 left-0 w-full h-full bg-[#2B579A] -rotate-45 -translate-y-1/2 -translate-x-1/2"></div>
                          <div className="absolute top-1 left-1 w-full h-0.5 bg-white/30 -rotate-45"></div>
                        </div>
                        <div className="text-[#2B579A] font-black text-2xl leading-none">W</div>
                        <div className="text-[#2B579A] text-[10px] font-bold mt-0.5">docx</div>
                      </div>
                      <span className="text-[13px] font-bold text-gray-900">DOCX</span>
                    </div>

                    {/* PDF Icon */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 relative flex items-center justify-center">
                        {/* Document Shape */}
                        <div className="absolute inset-0 bg-[#E5E7EB] rounded-lg">
                          <div className="absolute top-0 right-0 w-5 h-5 bg-[#9CA3AF] rounded-bl-lg rounded-tr-lg"></div>
                        </div>
                        {/* PDF Label */}
                        <div className="z-10 bg-[#EE3124] px-2 py-1 rounded shadow-sm">
                          <span className="text-white text-[11px] font-black">PDF</span>
                        </div>
                      </div>
                      <span className="text-[13px] font-bold text-gray-900">PDF</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

                {/* Template Upload Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-blue-100/80 p-8 rounded-[2.5rem] border border-blue-200 shadow-sm flex flex-col"
                >
                  <UploadZone
                    title="📄 서식 파일"
                    description={
                      <>
                        작성 서식파일<br />
                        <span className="text-red-500">#서식파일 업로드 필수!</span>
                      </>
                    }
                    accept={{
                      "application/pdf": [".pdf"],
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
                      "application/x-hwp": [".hwp"],
                      "application/vnd.hancom.hwpx": [".hwpx"],
                    }}
                    files={templateFiles}
                    onFilesSelected={setTemplateFiles}
                    onFileRemoved={() => setTemplateFiles([])}
                  />
                </motion.div>

                {/* Content Upload Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-blue-100/80 p-8 rounded-[2.5rem] border border-blue-200 shadow-sm flex flex-col"
                >
                  <UploadZone
                    title="📝 내용 자료"
                    description={
                      <>
                        아이디어, 타계획서, 기타기업자료<br />
                        <span className="text-red-500">#여러개의 파일 업로드 가능</span>
                        <div className="mt-3">
                          <button 
                            onClick={handleDownload}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 rounded-xl text-[14px] font-bold text-blue-600 hover:bg-blue-50 transition-all shadow-sm active:scale-95 cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                            "아이디어 작성 참고양식" 다운로드
                          </button>
                        </div>
                      </>
                    }
                    accept={{
                      "application/pdf": [".pdf"],
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
                      "text/plain": [".txt"],
                    }}
                    multiple
                    files={contentFiles}
                    onFilesSelected={setContentFiles}
                    onFileRemoved={(idx) => setContentFiles(prev => prev.filter((_, i) => i !== idx))}
                  />
                </motion.div>

                {/* Reference Upload Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-purple-100/80 p-8 rounded-[2.5rem] border border-purple-200 shadow-sm flex flex-col"
                >
                  <UploadZone
                    title="📚 참조 자료"
                    description={
                      <>
                        공고문, 지침, 준수 사항<br />
                        <span className="text-red-500">#여러개의 파일 업로드 가능</span>
                      </>
                    }
                    accept={{
                      "application/pdf": [".pdf"],
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
                      "text/plain": [".txt"],
                    }}
                    multiple
                    files={referenceFiles}
                    onFilesSelected={setReferenceFiles}
                    onFileRemoved={(idx) => setReferenceFiles(prev => prev.filter((_, i) => i !== idx))}
                  />
                </motion.div>

                {/* Manual Input Card - Spans all columns */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="md:col-span-3 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col gap-4 mt-4"
                >
                  <div className="flex flex-col gap-1">
                    <label className="text-2xl font-semibold text-gray-900">직접 내용 입력</label>
                    <div className="text-sm text-gray-400">텍스트로 아이디어를 자유롭게 적어주세요</div>
                  </div>
                  <textarea
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    placeholder="사업 아이디어나 핵심 포인트를 여기에 입력하세요..."
                    className="w-full h-full min-h-[200px] p-6 bg-gray-50/50 border border-gray-100 rounded-3xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-lg"
                  />
                </motion.div>
              </div>

              {/* Generate Action Button - Moved to bottom */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center"
              >
                <div className={cn(
                  "w-full max-w-2xl p-8 rounded-[2.5rem] border flex flex-col items-center justify-center gap-6 text-center transition-all duration-500",
                  (templateFiles.length > 0 && (contentFiles.length > 0 || manualContent.trim()))
                    ? "bg-blue-600 border-blue-500 shadow-2xl shadow-blue-200"
                    : "bg-gray-50 border-gray-100 grayscale opacity-80"
                )}>
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                    <Send className={cn("w-10 h-10 text-white", !isGenerating && "animate-bounce")} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <motion.button
                      whileHover={!(isGenerating || (templateFiles.length === 0 || (contentFiles.length === 0 && !manualContent.trim()))) ? { 
                        scale: 1.05, 
                        backgroundColor: "#f0f9ff", // blue-50
                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
                      } : {}}
                      whileTap={!(isGenerating || (templateFiles.length === 0 || (contentFiles.length === 0 && !manualContent.trim()))) ? { scale: 0.95 } : {}}
                      onClick={generatePlan}
                      disabled={isGenerating || (templateFiles.length === 0 || (contentFiles.length === 0 && !manualContent.trim()))}
                      className={cn(
                        "px-12 py-5 rounded-2xl font-extrabold text-2xl transition-all duration-300 shadow-lg disabled:cursor-not-allowed leading-tight",
                        (templateFiles.length > 0 && (contentFiles.length > 0 || manualContent.trim()))
                          ? "bg-white text-blue-600"
                          : "bg-gray-200 text-gray-400"
                      )}
                    >
                      {isGenerating ? "생성 중..." : (
                        <>
                          사업계획서 <br className="md:hidden" /> 초안 생성하기
                        </>
                      )}
                    </motion.button>
                    <p className={cn(
                      "text-sm font-medium",
                      (templateFiles.length > 0 && (contentFiles.length > 0 || manualContent.trim()))
                        ? "text-blue-50"
                        : "text-gray-900"
                    )}>
                      {templateFiles.length > 0 && (contentFiles.length > 0 || manualContent.trim()) 
                        ? "모든 준비가 완료되었습니다. 버튼을 눌러 시작하세요!" 
                        : "서식과 내용을 먼저 업로드해주세요."}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Result Preview - Full Width Below Grid */}
              <div className="mt-12 flex flex-col gap-10 w-full max-w-full overflow-x-hidden">
                {result && (
                  <div className="flex items-center justify-center p-1 bg-gray-100/80 rounded-2xl self-center shadow-inner">
                    <button
                      onClick={() => setIsPreviewMode("visual")}
                      className={cn(
                        "px-6 py-3 rounded-[1.25rem] text-sm md:text-base font-bold transition-all flex flex-col items-center justify-center gap-1 min-w-[120px] md:min-w-[140px]",
                        isPreviewMode === "visual"
                          ? "bg-white text-blue-600 shadow-xl"
                          : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      <Layout className="w-5 h-5 mb-0.5" />
                      <span className="text-center leading-tight">비주얼<br/>미리보기</span>
                    </button>
                    <button
                      onClick={() => setIsPreviewMode("editor")}
                      className={cn(
                        "px-6 py-3 rounded-[1.25rem] text-sm md:text-base font-bold transition-all flex flex-col items-center justify-center gap-1 min-w-[120px] md:min-w-[140px]",
                        isPreviewMode === "editor"
                          ? "bg-white text-cyan-600 shadow-xl"
                          : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      <FileText className="w-5 h-5 mb-0.5" />
                      <span className="text-center leading-tight">RHWP 워드<br/>편집기</span>
                    </button>
                  </div>
                )}

                {isPreviewMode === "visual" ? (
                  <>
                    {result && result.missingInfoQuestions && result.missingInfoQuestions.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-amber-50 border border-amber-100 rounded-[2.5rem] p-10 flex flex-col gap-8 shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                            <AlertCircle className="w-7 h-7 text-amber-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-amber-900">더 완벽한 계획서를 위해 추가 정보가 필요합니다</h3>
                            <p className="text-amber-700 font-medium">아래 질문에 답변해주시면 계획서를 더 정교하게 보완해 드릴게요.</p>
                          </div>
                        </div>
                        
                        <div className="grid gap-4">
                          {result.missingInfoQuestions.map((q, i) => (
                            <div key={i} className="flex gap-4 items-start bg-white/50 p-4 rounded-2xl border border-amber-200/50">
                              <span className="w-8 h-8 rounded-xl bg-amber-200 text-amber-800 text-sm font-bold flex items-center justify-center shrink-0">{i+1}</span>
                              <p className="text-amber-900 font-bold leading-relaxed pt-1">{q}</p>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col gap-4">
                          <textarea
                            value={additionalInfo}
                            onChange={(e) => setAdditionalInfo(e.target.value)}
                            placeholder="여기에 답변을 입력해주세요 (예: 1번 질문에 대해서는...)"
                            className="w-full h-40 p-6 rounded-[1.5rem] border border-amber-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none resize-none text-lg bg-white"
                          />
                          <button
                            onClick={handleAdditionalSubmit}
                            disabled={isSubmittingFeedback || isGenerating}
                            className="self-end px-10 py-4 bg-amber-600 text-white rounded-2xl font-extrabold text-lg hover:bg-amber-700 transition-all shadow-xl shadow-amber-200 disabled:opacity-50 active:scale-95"
                          >
                            {isSubmittingFeedback ? "보완 중..." : "답변 제출하고 계획서 보완하기"}
                          </button>
                        </div>
                      </motion.div>
                    )}

                    <PlanPreview
                      ref={previewRef}
                      title={result?.documentTitle || ""}
                      sections={result?.sections || []}
                      summary={result?.summary || ""}
                      onDownloadDocx={downloadDocx}
                      onDownloadPdf={downloadPdf}
                      onDownloadHwpx={downloadHwpx}
                      isGenerating={isGenerating}
                    />
                  </>
                ) : (
                  <RhwpEditorPanel 
                    hwpxBuffer={hwpxBuffer} 
                    fileName={`${result?.documentTitle || "사업계획서"}.hwpx`}
                    isGenerating={isGenerating}
                  />
                )}
              </div>
            </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center">
          {/* 실제로고이미지파일을 src/assets 폴더 등에 업로드한 후 아래 경로를 수정하세요 */}
          <img 
            src="/logo.jpg" 
            alt="달서구 사회적경제지원센터 로고"
            className="h-20 md:h-24 object-contain opacity-90 hover:opacity-100 transition-opacity"
            referrerPolicy="no-referrer"
          />
        </div>
      </footer>
    </div>
  );
}
