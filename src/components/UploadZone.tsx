import React, { useCallback } from "react";
import { useDropzone, Accept } from "react-dropzone";
import { Upload, X, FileText, File as FileIcon } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface UploadZoneProps {
  title: string;
  description: React.ReactNode;
  accept: Accept;
  multiple?: boolean;
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onFileRemoved: (index: number) => void;
  className?: string;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  title,
  description,
  accept,
  multiple = false,
  files,
  onFilesSelected,
  onFileRemoved,
  className,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (multiple) {
        onFilesSelected([...files, ...acceptedFiles]);
      } else {
        onFilesSelected(acceptedFiles);
      }
    },
    [files, multiple, onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
  } as any);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex flex-col gap-2 mb-8">
        <h3 className="text-[27px] font-semibold text-gray-900">{title}</h3>
        <div className="text-[19px] text-gray-500">{description}</div>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer mt-auto",
          isDragActive
            ? "border-blue-500 bg-blue-100/50"
            : "border-gray-300 bg-white/50 hover:border-blue-400 hover:bg-blue-50/50 shadow-inner"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <div className="p-3 rounded-full bg-white shadow-sm border border-gray-100">
            <Upload className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[19px] text-gray-700">
              {isDragActive ? "여기에 파일을 놓으세요" : (
                <>
                  클릭해서 파일을 업로드하세요.<br />
                  (드래그&드롭 가능)
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-2"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 rounded-lg bg-blue-50">
                  {file.type.includes("pdf") ? (
                    <FileText className="w-4 h-4 text-blue-600" />
                  ) : (
                    <FileIcon className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFileRemoved(index);
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
