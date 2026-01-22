import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { FileUploadZone } from '@/components/FileUploadZone';
import { SummaryCards } from '@/components/SummaryCards';
import { DataTable } from '@/components/DataTable';
import { ExportButton } from '@/components/ExportButton';
import { NotaFiscal } from '@/lib/xmlParser';
import { Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Index = () => {
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleFilesProcessed = (newNotas: NotaFiscal[]) => {
    setNotas(prev => {
      const updated = [...prev];
      const toAdd: NotaFiscal[] = [];

      for (const n of newNotas) {
        if ((n as any).isCancellationFile) {
          // Aplica cancelamento na nota existente (se encontrada)
          const idx = updated.findIndex(p => p.chaveAcesso === n.chaveAcesso);
          if (idx !== -1) {
            updated[idx] = { 
              ...updated[idx], 
              situacao: 'Cancelada', 
              situacaoInfo: n.situacaoInfo,
              dataMudancaSituacao: n.dataMudancaSituacao 
            };
          } else {
            // Se não existe nota correspondente, adiciona o arquivo de cancelamento como registro visível
            toAdd.push(n);
          }
        } else {
          toAdd.push(n);
        }
      }

      return [...updated, ...toAdd];
    });
  };

  const handleClear = () => {
    setNotas([]);
    setSearchTerm('');
  };

  const filteredNotas = useMemo(() => {
    if (!searchTerm.trim()) return notas;
    
    const term = searchTerm.toLowerCase();
    return notas.filter(nota => 
      nota.numero.toLowerCase().includes(term) ||
      nota.fornecedorCliente.toLowerCase().includes(term) ||
      nota.tipo.toLowerCase().includes(term) ||
      nota.tipoOperacao.toLowerCase().includes(term) ||
      nota.dataEmissao.toLowerCase().includes(term)
    );
  }, [notas, searchTerm]);

  return (
    <div className="min-h-screen gradient-surface">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Header />
        
        <div className="space-y-8">
          <FileUploadZone
            onFilesProcessed={handleFilesProcessed}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
            existingNotas={notas}
          />

          {notas.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Resumo dos Dados
                </h2>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClear}
                    className="gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Limpar
                  </Button>
                  <ExportButton data={notas} />
                </div>
              </div>

              <SummaryCards data={notas} />
              
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Dados Extraídos ({filteredNotas.length}{filteredNotas.length !== notas.length ? ` de ${notas.length}` : ''})
                  </h2>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Pesquisar por número, fornecedor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <DataTable data={filteredNotas} />
              </div>
            </motion.div>
          )}

          {notas.length === 0 && !isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center py-8"
            >
              <p className="text-muted-foreground">
                Carregue seus arquivos XML para visualizar e exportar os dados fiscais.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
