import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { parseNFeXML, NotaFiscal } from '@/lib/xmlParser';
import { DuplicateDialog } from './DuplicateDialog';
import { ErrorDialog } from './ErrorDialog';

interface FileError {
  fileName: string;
  reason: string;
}

interface FileUploadZoneProps {
  onFilesProcessed: (notas: NotaFiscal[]) => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  existingNotas: NotaFiscal[];
}

export function FileUploadZone({ onFilesProcessed, isProcessing, setIsProcessing, existingNotas }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [processedCount, setProcessedCount] = useState({ success: 0, failed: 0 });
  const [pendingNotas, setPendingNotas] = useState<NotaFiscal[]>([]);
  const [duplicates, setDuplicates] = useState<NotaFiscal[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [fileErrors, setFileErrors] = useState<FileError[]>([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  // Lê conteúdo de arquivo com detecção de encoding e fallback
  async function readFileContent(file: File): Promise<string> {
    try {
      const txt = await file.text();
      if (txt?.trim()) return txt;

      const ab = await file.arrayBuffer();
      const bytes = new Uint8Array(ab);

      // Detecta arquivos zip (PK signature) e pula
      if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4B) {
        console.warn(`Arquivo zip ignorado: ${file.name}`);
        return '';
      }

      // Detecta encoding e decodifica
      let decoder: TextDecoder;
      if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
        decoder = new TextDecoder('utf-16le');
      } else if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
        decoder = new TextDecoder('utf-16be');
      } else {
        decoder = new TextDecoder('iso-8859-1');
      }

      return decoder.decode(ab).trim();
    } catch (e) {
      console.error(`Erro lendo ${file.name}:`, e);
      return '';
    }
  }

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setIsProcessing(true);
    setProcessedCount({ success: 0, failed: 0 });
    const errors: FileError[] = [];

    const xmlFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.xml'));
    if (xmlFiles.length === 0) {
      setIsProcessing(false);
      return;
    }

    const notas: NotaFiscal[] = [];
    let success = 0;
    let failed = 0;

    for (const file of xmlFiles) {
      try {
        const content = await readFileContent(file as File);

        if (!content) {
          errors.push({ fileName: file.name, reason: 'Arquivo vazio ou não decodificável' });
          failed++;
          setProcessedCount({ success, failed });
          continue;
        }

        // Ignora arquivos de evento
        if (/<\s*procEvento(NFe|CTe)|<\s*evento(NFe|CTe)/i.test(content)) {
          errors.push({ fileName: file.name, reason: 'Arquivo de evento (não é nota autorizada)' });
          failed++;
          setProcessedCount({ success, failed });
          continue;
        }

        const nota = parseNFeXML(content, file.name);
        if (nota) {
          nota.dataInsercao = new Date().toLocaleDateString('pt-BR');
          notas.push(nota);
          success++;
        } else {
          errors.push({ fileName: file.name, reason: 'XML corrompido ou formato não suportado' });
          failed++;
        }
      } catch (error) {
        errors.push({
          fileName: file.name,
          reason: error instanceof Error ? error.message : 'Erro desconhecido'
        });
        failed++;
      }
      setProcessedCount({ success, failed });
    }

    if (errors.length > 0) {
      setFileErrors(errors);
      setShowErrorDialog(true);
    }

    // Verifica duplicatas
    const existingKeys = new Set(existingNotas.map(n => n.chaveAcesso));
    const duplicateNotas = notas.filter(n => existingKeys.has(n.chaveAcesso));
    const uniqueNotas = notas.filter(n => !existingKeys.has(n.chaveAcesso));

    if (duplicateNotas.length > 0) {
      setPendingNotas(uniqueNotas);
      setDuplicates(duplicateNotas);
      setShowDuplicateDialog(true);
    } else {
      onFilesProcessed(notas);
    }
    
    setIsProcessing(false);
  }, [onFilesProcessed, setIsProcessing, existingNotas]);

  const handleConfirmDuplicates = () => {
    // Import all including duplicates
    onFilesProcessed([...pendingNotas, ...duplicates]);
    setShowDuplicateDialog(false);
    setPendingNotas([]);
    setDuplicates([]);
  };

  const handleCancelDuplicates = () => {
    // Import only non-duplicates
    if (pendingNotas.length > 0) {
      onFilesProcessed(pendingNotas);
    }
    setShowDuplicateDialog(false);
    setPendingNotas([]);
    setDuplicates([]);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    e.target.value = '';
  }, [processFiles]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center 
          w-full min-h-[280px] p-8
          border-2 border-dashed rounded-xl cursor-pointer
          transition-all duration-300 ease-out
          ${isDragging 
            ? 'border-primary bg-primary/6 scale-[1.02] shadow-glow' 
            : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50'
          }
          ${isProcessing ? 'pointer-events-none' : ''}
        `}
      >
        <input
          type="file"
          accept=".xml"
          multiple
          onChange={handleFileSelect}
          className="sr-only"
          disabled={isProcessing}
        />

        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">
                  Processando arquivos...
                </p>
                <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    {processedCount.success} sucesso
                  </span>
                  {processedCount.failed > 0 && (
                    <span className="flex items-center gap-1">
                      <XCircle className="w-4 h-4 text-destructive" />
                      {processedCount.failed} falha
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className={`
                p-4 rounded-full transition-colors duration-300
                ${isDragging ? 'bg-primary/10 shadow-glow' : 'bg-muted/20'}
              `}>
                {isDragging ? (
                  <FileText className="w-10 h-10 text-primary" />
                ) : (
                  <Upload className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
              
              <div>
                <p className="text-lg font-medium text-foreground">
                  {isDragging ? 'Solte os arquivos aqui' : 'Arraste arquivos XML aqui'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  ou clique para selecionar
                </p>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 mt-2 rounded-lg bg-muted/20 border border-border">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  XML • NF-e • CT-e • Múltiplos
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </label>

      <DuplicateDialog
        open={showDuplicateDialog}
        duplicates={duplicates}
        onConfirm={handleConfirmDuplicates}
        onCancel={handleCancelDuplicates}
      />

      <ErrorDialog
        open={showErrorDialog}
        errors={fileErrors}
        onClose={() => {
          setShowErrorDialog(false);
          setFileErrors([]);
        }}
      />
    </motion.div>
  );
}
