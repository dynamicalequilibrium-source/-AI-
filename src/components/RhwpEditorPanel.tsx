import React, { useEffect, useRef, useState } from "react";
import { createEditor } from "@rhwp/editor";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, AlertCircle, FileEdit, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface RhwpEditorPanelProps {
  hwpxBuffer: ArrayBuffer | null;
  fileName: string;
  isGenerating: boolean;
}

export const RhwpEditorPanel: React.FC<RhwpEditorPanelProps> = ({
  hwpxBuffer,
  fileName,
  isGenerating,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initEditor = async () => {
      if (!containerRef.current) return;
      
      try {
        if (!editorRef.current) {
          console.log("[RHWP] Initializing Editor...");
          // Ensure container is clean to avoid double-toolbars in React dev mode
          containerRef.current.innerHTML = "";
          editorRef.current = await createEditor(containerRef.current);
          console.log("[RHWP] Editor instance created");
        }
        
        if (mounted) {
          setIsReady(true);
          setError(null);
        }

        if (hwpxBuffer && hwpxBuffer.byteLength > 0 && editorRef.current) {
          try {
            console.log(`[RHWP] Loading document: ${fileName} (${hwpxBuffer.byteLength} bytes)`);
            const bytes = new Uint8Array(hwpxBuffer);
            
            // Give DOM a bit more time to settle
            await new Promise(resolve => setTimeout(resolve, 500));
            
            await editorRef.current.loadFile(bytes, fileName);
            console.log("[RHWP] Document loaded successfully");
            if (mounted) setError(null);
          } catch (loadErr) {
            console.error("[RHWP] loadFile failed:", loadErr);
            if (mounted) {
              setError(`문서를 불러오는 중 오류가 발생했습니다: ${loadErr instanceof Error ? loadErr.message : "파일 형식이 올바르지 않거나 손상되었습니다."}`);
            }
          }
        } else if (hwpxBuffer && hwpxBuffer.byteLength === 0) {
          console.warn("[RHWP] Received empty buffer");
          if (mounted) setError("생성된 문서 데이터가 비어 있습니다.");
        }
      } catch (err) {
        console.error("[RHWP] Initialization failed:", err);
        if (mounted) {
          setError("에디터 초기화에 실패했습니다. 페이지를 새로고침 해주세요.");
        }
      }
    };

    if (!isGenerating) {
      initEditor();
    }

    return () => {
      mounted = false;
    };
  }, [hwpxBuffer, fileName, isGenerating]);

  return (
    <div className={cn("bg-white border border-gray-100 shadow-sm overflow-hidden flex flex-col transition-all duration-300", isFullScreen ? "fixed inset-0 z-[100]" : "relative rounded-xl min-h-[800px]")}>
      <div className="flex items-center justify-between bg-gray-50/50 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-100">
            <FileEdit className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">RHWP 실시간 에디터</h3>
          {isGenerating && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-xs font-medium animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              생성 중...
            </div>
          )}
        </div>
        <button
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          title={isFullScreen ? "축소하기" : "전체화면"}
        >
          {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <div className="relative flex-1 bg-gray-50 min-h-0" style={{ height: isFullScreen ? 'calc(100vh - 56px)' : '800px' }}>
        <AnimatePresence>
          {(!isReady || isGenerating) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] gap-4"
            >
              <Loader2 className="w-10 h-10 text-cyan-600 animate-spin" />
              <p className="text-sm font-medium text-gray-600">
                {isGenerating ? "사업계획서를 에디터로 불러오는 중..." : "에디터를 준비하고 있습니다..."}
              </p>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-50 gap-4 p-8 text-center"
            >
              <AlertCircle className="w-12 h-12 text-red-500" />
              <div className="flex flex-col gap-2">
                <h4 className="text-lg font-bold text-red-900">에디터 오류</h4>
                <p className="text-sm text-red-700">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
                >
                  새로고침
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          ref={containerRef} 
          className="w-full h-full"
          id="rhwp-container"
        />
      </div>
      
      {!isFullScreen && (
        <div className="flex items-start gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-blue-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            RHWP 에디터는 웹 브라우저에서 HWP/HWPX 파일을 직접 편집할 수 있는 도구입니다. 
            AI가 생성한 초안을 로드한 후 직접 수정하거나 형식을 조정할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
};
