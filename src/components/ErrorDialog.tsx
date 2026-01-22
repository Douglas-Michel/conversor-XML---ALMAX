import { AlertTriangle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileError {
  fileName: string;
  reason: string;
}

interface ErrorDialogProps {
  open: boolean;
  errors: FileError[];
  onClose: () => void;
}

export function ErrorDialog({ open, errors, onClose }: ErrorDialogProps) {
  if (!errors.length) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <DialogTitle>Arquivos com Problemas</DialogTitle>
          </div>
          <DialogDescription>
            {errors.length} arquivo{errors.length !== 1 ? 's' : ''} não conseguiram ser processado{errors.length !== 1 ? 's' : ''}. 
            Verifique os detalhes e reenvie os arquivos corretos.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm font-medium text-destructive">
              ⚠️ Dicas para resolver:
            </p>
            <ul className="text-xs text-destructive/80 mt-2 space-y-1 ml-4 list-disc">
              <li>Verifique se o arquivo é uma <strong>nota fiscal autorizada</strong> (com protocolo SEFAZ)</li>
              <li>Não envie XMLs de eventos, cancelamentos ou cartas de correção isoladamente</li>
              <li>Certifique-se de que o arquivo não está corrompido</li>
              <li>Tente redownload do arquivo da SEFAZ/emissor</li>
            </ul>
          </div>

          <ScrollArea className="h-[300px] w-full rounded-lg border border-border bg-muted/30 p-4">
            <div className="space-y-3">
              {errors.map((error, index) => (
                <div
                  key={index}
                  className="flex gap-3 p-3 bg-background border border-destructive/20 rounded-lg"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <X className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground break-words">
                      {error.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {error.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Entendido, vou verificar os arquivos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
