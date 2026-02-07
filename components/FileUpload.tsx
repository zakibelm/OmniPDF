
import React, { useRef, useState } from 'react';
import { FileData } from '../types';

interface FileUploadProps {
  onFilesSelect: (files: FileData[]) => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList) => {
    setIsReading(true);
    const filePromises = Array.from(fileList).map((file) => {
      return new Promise<FileData>((resolve) => {
        const reader = new FileReader();
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve({
            id: Math.random().toString(36).substr(2, 9) + Date.now(),
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            content: (!isImage && !isPdf) ? result : undefined,
            base64: (isImage || isPdf) ? result.split(',')[1] : undefined,
            // If it's a PDF, we mark it as READY immediately
            status: isPdf ? 'READY' : 'PENDING',
            result: isPdf ? {
              title: file.name,
              content: "DOCUMENT_ORIGINAL_PDF",
              summary: "Ce fichier est un PDF original. Il a été accepté sans traitement IA supplémentaire pour préserver son intégrité.",
              tags: ["Original", "PDF"]
            } : undefined
          });
        };

        if (isImage || isPdf) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      });
    });

    try {
      const newFiles = await Promise.all(filePromises);
      onFilesSelect(newFiles);
    } catch (err) {
      console.error("Erreur de lecture :", err);
    } finally {
      setIsReading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || !e.dataTransfer.files) return;
    handleFiles(e.dataTransfer.files);
  };

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
        isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 bg-white'
      } ${disabled || isReading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={() => !disabled && !isReading && fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={onSelect}
        className="hidden"
        disabled={disabled || isReading}
        multiple
      />
      <div className="flex flex-col items-center">
        {isReading ? (
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2"></div>
            <p className="text-xs font-bold text-indigo-600 animate-pulse uppercase tracking-tighter">Acquisition...</p>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">Ajouter des fichiers</h3>
            <p className="text-[10px] text-slate-500 mt-1">PDF Direct & Multi-Format</p>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
