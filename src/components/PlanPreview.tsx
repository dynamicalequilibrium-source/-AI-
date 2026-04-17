import React from "react";
import { Download, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

interface PlanPreviewProps {
  title: string;
  sections: Section[];
  summary: string;
  onDownloadDocx: () => void;
  onDownloadPdf: () => void;
  onDownloadHwpx: () => void;
  isGenerating: boolean;
}

const MarkdownContent = ({ content }: { content: string }) => {
  return (
    <div className="markdown-body prose prose-blue max-w-none text-gray-700 text-lg leading-relaxed">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Handle custom tags like [AI보완], [확인필요] and key phrases
          p: ({ children }) => {
            const processText = (text: string) => {
              const parts = text.split(/(\[AI보완\]|\[확인필요\]|^[\s\-\d\.･]*[^:\n\s][^:\n]*:)/g);
              return parts.map((part, i) => {
                if (part === "[AI보완]") {
                  return <span key={i} className="text-blue-600 font-bold">{part}</span>;
                }
                if (part === "[확인필요]") {
                  return <span key={i} className="text-red-600 font-bold">{part}</span>;
                }
                if (part && part.endsWith(":") && !part.includes("\n")) {
                  return <span key={i} className="font-bold text-gray-900">{part}</span>;
                }
                return part;
              });
            };

            return (
              <p>
                {React.Children.map(children, child => {
                  if (typeof child === 'string') {
                    return processText(child);
                  }
                  return child;
                })}
              </p>
            );
          },
          table: ({ children }) => (
            <div className="my-6 overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-base text-left border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">{children}</thead>,
          th: ({ children }) => <th className="px-5 py-4 border-r border-gray-200 last:border-0">{children}</th>,
          td: ({ children }) => <td className="px-5 py-4 text-gray-600 border-r border-gray-100 last:border-0">{children}</td>,
          tr: ({ children }) => <tr className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">{children}</tr>
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const PlanPreview = React.forwardRef<HTMLDivElement, PlanPreviewProps>(({
  title,
  sections,
  summary,
  onDownloadDocx,
  onDownloadPdf,
  onDownloadHwpx,
  isGenerating,
}, ref) => {
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full"
          />
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-blue-600" />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold text-gray-900">계획서를 생성하는 중입니다...</h3>
          <p className="text-gray-500 max-w-md">
            Gemini가 문서를 분석하고 전문적인 사업계획서를 작성하고 있습니다. 잠시만 기다려 주세요.
          </p>
        </div>
      </div>
    );
  }

  if (sections.length === 0) return null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-8 pb-20 bg-white p-12 shadow-sm border border-gray-100"
    >
      <div className="flex items-center justify-between border-b border-gray-100 pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            생성 완료
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 font-medium mr-1">다운로드받기</span>
          <button
            onClick={onDownloadHwpx}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl font-semibold hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200 active:scale-95"
          >
            <Download className="w-5 h-5" />
            HWPX
          </button>
          <button
            onClick={onDownloadDocx}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <Download className="w-5 h-5" />
            DOCX
          </button>
          <button
            onClick={onDownloadPdf}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
          >
            <Download className="w-5 h-5" />
            PDF
          </button>
        </div>
      </div>

      <div className="bg-blue-50/50 rounded-2xl p-8 border border-blue-100">
        <h3 className="text-base font-bold text-blue-900 uppercase tracking-wider mb-3">핵심 요약 (Executive Summary)</h3>
        <p className="text-blue-800 text-lg leading-relaxed whitespace-pre-wrap">{summary}</p>
      </div>

      <div className="grid gap-10">
        {sections.map((section, index) => (
          <div key={index} className="flex flex-col gap-6 group">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">{section.title}</h3>
              {section.hasAiSupport && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 text-sm font-bold uppercase tracking-tight border border-purple-100">
                  <Sparkles className="w-4 h-4" />
                  AI 보완됨
                </span>
              )}
            </div>
            
            <MarkdownContent content={section.content} />
            
            {section.table && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-base text-left">
                  <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      {section.table.headers.map((header, hIdx) => (
                        <th key={hIdx} className="px-5 py-4 border-r border-gray-200 last:border-0">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {section.table.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-gray-50/50 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-5 py-4 text-gray-600 whitespace-pre-wrap border-r border-gray-100 last:border-0">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {section.warnings && section.warnings.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                {section.warnings.map((warning, wIndex) => (
                  <div key={wIndex} className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="h-px bg-gray-100 w-full mt-4 group-last:hidden" />
          </div>
        ))}
      </div>
    </motion.div>
  );
});
