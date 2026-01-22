import { motion } from 'framer-motion';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotaFiscal } from '@/lib/xmlParser';
import { exportToExcel } from '@/lib/excelExport';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ExportButtonProps {
  data: NotaFiscal[];
}

export function ExportButton({ data }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
      exportToExcel(data);
      toast({
        title: 'Exportação concluída',
        description: `${data.length} documento${data.length !== 1 ? 's' : ''} exportado${data.length !== 1 ? 's' : ''} com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o arquivo Excel.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (data.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Button
        onClick={handleExport}
        disabled={isExporting}
        size="lg"
        className="gap-2 font-semibold shadow-soft hover:shadow-elevated transition-shadow"
      >
        {isExporting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Download className="w-5 h-5" />
        )}
        Exportar Excel
      </Button>
    </motion.div>
  );
}
