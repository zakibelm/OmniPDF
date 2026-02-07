
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppStatus, FileData } from './types';
import FileUpload from './components/FileUpload';
import DocumentPreview from './components/DocumentPreview';
import { processDocument, suggestFolders } from './services/geminiService';

const App: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState<'drive' | 'notebooklm'>('drive');
  const [folderName, setFolderName] = useState('');
  const [suggestedFolders, setSuggestedFolders] = useState<string[]>([]);
  const [exportStep, setExportStep] = useState<'config' | 'transfer'>('config');
  const [transferProgress, setTransferProgress] = useState<Record<string, number>>({});
  
  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const pendingFiles = files.filter(f => f.status === 'PENDING' && !processingRef.current.has(f.id));
    if (pendingFiles.length > 0) {
      pendingFiles.forEach(async (file) => {
        processingRef.current.add(file.id);
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'PROCESSING' } : f));
        try {
          const result = await processDocument(file);
          setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'READY', result } : f));
          setSelectedFileId(prev => prev || file.id);
        } catch (error) {
          setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'ERROR' } : f));
        } finally {
          processingRef.current.delete(file.id);
        }
      });
    }
  }, [files]);

  // Suggest folders when files are ready
  useEffect(() => {
    const readyFiles = files.filter(f => f.status === 'READY');
    if (readyFiles.length > 0 && suggestedFolders.length === 0) {
      suggestFolders(readyFiles.map(f => f.name)).then(setSuggestedFolders);
    }
  }, [files, suggestedFolders.length]);

  const handleFilesSelect = (newFiles: FileData[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const stats = useMemo(() => ({
    total: files.length,
    processed: files.filter(f => f.status === 'READY').length,
    processing: files.filter(f => f.status === 'PROCESSING').length,
  }), [files]);

  const selectedFile = useMemo(() => files.find(f => f.id === selectedFileId), [files, selectedFileId]);

  const startExportTransfer = async () => {
    setExportStep('transfer');
    const readyFiles = files.filter(f => f.status === 'READY');
    
    for (const file of readyFiles) {
      // Simulate individual file upload progress
      for (let i = 0; i <= 100; i += 20) {
        setTransferProgress(prev => ({ ...prev, [file.id]: i }));
        await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      }
    }

    setTimeout(() => {
      alert(`Transfert terminé ! ${readyFiles.length} fichiers ont été exportés vers ${exportTarget.toUpperCase()} dans le dossier "${folderName || 'OmniPDF_Root'}".`);
      setIsExportModalOpen(false);
      setExportStep('config');
      setTransferProgress({});
    }, 1000);
  };

  const removeFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles(prev => prev.filter(f => f.id !== id));
    if (selectedFileId === id) setSelectedFileId(null);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 h-16 flex items-center justify-between no-print">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">O</div>
          <h1 className="font-black text-slate-900">OmniPDF <span className="text-indigo-600 text-xs font-bold px-1.5 py-0.5 bg-indigo-50 rounded ml-1">ULTRA CLOUD</span></h1>
        </div>
        
        {stats.processed > 0 && (
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="px-5 py-2 bg-slate-900 text-white text-xs font-black rounded-full hover:scale-105 transition-transform shadow-lg shadow-slate-200"
          >
            TRANFÉRER VERS CLOUD ({stats.processed})
          </button>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-slate-200 bg-white flex flex-col no-print">
          <div className="p-4 border-b border-slate-100"><FileUpload onFilesSelect={handleFilesSelect} /></div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {files.map(file => (
              <div 
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedFileId === file.id ? 'bg-indigo-50 border-indigo-100' : 'border-transparent hover:bg-slate-50'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                    <span className={`text-[9px] font-black uppercase ${file.status === 'READY' ? 'text-green-600' : 'text-indigo-600 animate-pulse'}`}>
                      {file.status} {file.type === 'application/pdf' ? '• PDF ORIG' : ''}
                    </span>
                  </div>
                  <button onClick={(e) => removeFile(file.id, e)} className="text-slate-300 hover:text-red-500"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 bg-slate-50 p-8 overflow-y-auto">
          {selectedFile?.status === 'READY' && selectedFile.result ? (
            <DocumentPreview result={selectedFile.result} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
              <p className="font-black uppercase text-xs tracking-widest">En attente de documents</p>
            </div>
          )}
        </main>
      </div>

      {/* Cloud Transfer Manager Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
            {exportStep === 'config' ? (
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic">Destination Cloud</h2>
                  <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-slate-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setExportTarget('drive')} className={`p-8 rounded-3xl border-4 transition-all flex flex-col items-center ${exportTarget === 'drive' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}>
                    <svg className="w-14 h-14 mb-3" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="#34A853"/><path d="M12 2L19.5 20.29L12 18V2Z" fill="#FBBC05"/><path d="M12 18L5.21 21L4.5 20.29L12 2V18Z" fill="#EA4335"/></svg>
                    <span className="font-black text-xs uppercase">Google Drive</span>
                  </button>
                  <button onClick={() => setExportTarget('notebooklm')} className={`p-8 rounded-3xl border-4 transition-all flex flex-col items-center ${exportTarget === 'notebooklm' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}>
                    <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-2xl mb-3 shadow-lg">N</div>
                    <span className="font-black text-xs uppercase">NotebookLM</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Organisation intelligente (Gemini Suggestions)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {suggestedFolders.map(s => (
                      <button key={s} onClick={() => setFolderName(s)} className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-600 hover:text-white border border-slate-200 rounded-lg text-[10px] font-bold transition-all">
                        + {s}
                      </button>
                    ))}
                  </div>
                  <input 
                    type="text" 
                    placeholder="Entrez un nom de dossier ou choisissez une suggestion..." 
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-indigo-600 outline-none transition-all"
                  />
                </div>

                <button onClick={startExportTransfer} className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl hover:bg-indigo-600 transition-all text-lg shadow-2xl shadow-indigo-100">
                  LANCER LE TRANSFERT ({stats.processed} fichiers)
                </button>
              </div>
            ) : (
              <div className="p-10 space-y-8 animate-in zoom-in-95 duration-500">
                <div className="text-center">
                   <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-indigo-100">
                      <svg className="w-10 h-10 text-indigo-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                   </div>
                   <h3 className="text-2xl font-black text-slate-900">Synchronisation Cloud...</h3>
                   <p className="text-xs text-slate-400 font-bold uppercase mt-1">Vers {exportTarget === 'drive' ? 'Google Drive' : 'NotebookLM'} / {folderName || 'Root'}</p>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {files.filter(f => f.status === 'READY').map(file => (
                    <div key={file.id} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-slate-800 truncate mb-1">{file.name}</p>
                        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 transition-all duration-300" 
                            style={{ width: `${transferProgress[file.id] || 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="ml-4 text-[10px] font-black text-indigo-600 w-10 text-right">
                        {transferProgress[file.id] === 100 ? 'OK' : `${transferProgress[file.id] || 0}%`}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-indigo-50 p-4 rounded-2xl text-center">
                   <p className="text-[10px] font-bold text-indigo-600 italic">"L'IA prépare les métadonnées pour NotebookLM afin d'améliorer la recherche contextuelle."</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
