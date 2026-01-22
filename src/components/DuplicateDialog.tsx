import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { NotaFiscal } from '@/lib/xmlParser';
import { AlertTriangle } from 'lucide-react';

interface DuplicateDialogProps {
  open: boolean;
  duplicates: NotaFiscal[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function DuplicateDialog({ open, duplicates, onConfirm, onCancel }: DuplicateDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogTitle>Documentos Duplicados</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {duplicates.length === 1 ? (
              <span>
                O documento <strong>{duplicates[0]?.numero}</strong> ({duplicates[0]?.tipo}) já foi importado anteriormente.
              </span>
            ) : (
              <span>
                {duplicates.length} documentos já foram importados anteriormente:
              </span>
            )}
          </AlertDialogDescription>
          {duplicates.length > 1 && (
            <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-border bg-card p-2 shadow-soft">
              <ul className="text-sm text-muted-foreground space-y-1">
                {duplicates.slice(0, 10).map((nota, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>{nota.tipo} {nota.numero}</span>
                    <span className="text-xs">{nota.fornecedorCliente.slice(0, 20)}...</span>
                  </li>
                ))}
                {duplicates.length > 10 && (
                  <li className="text-xs text-muted-foreground/70">
                    ... e mais {duplicates.length - 10} documento(s)
                  </li>
                )}
              </ul>
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onClick={onCancel}>
            Cancelar e Revisar
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            Importar Mesmo Assim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
