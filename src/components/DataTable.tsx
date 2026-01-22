import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NotaFiscal, formatCurrency, formatPercent } from '@/lib/xmlParser';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface DataTableProps {
  data: NotaFiscal[];
}

export function DataTable({ data }: DataTableProps) {
  if (data.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-xl border border-border bg-card shadow-soft overflow-hidden"
    >
      <ScrollArea className="w-full">
        <div className="min-w-[2300px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">Data Emissão</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">Tipo NF</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap">Fornecedor/Cliente</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">Nº NF-e</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">Nº CT-E</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap">Material</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">Valor</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">Alíq. PIS</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">PIS</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">Alíq. COF</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">COFINS</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">Alíq. IPI</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">IPI</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">Alíq. ICMS</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">ICMS</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">Alíq. DIFAL</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">DIFAL</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">ANO</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">Reduz ICMS</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">MÊS</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">Data Inserção</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">Situação</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">Data Mudança</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((nota, index) => (
                <motion.tr
                  key={nota.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="group hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="text-sm text-muted-foreground text-center whitespace-nowrap">
                    {nota.dataEmissao}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={nota.tipoOperacao === 'Entrada' ? 'blue' : 'destructive'}
                      className="text-xs whitespace-nowrap"
                    >
                      {nota.tipoOperacao}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate text-sm" title={nota.fornecedorCliente}>
                    {nota.fornecedorCliente}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-center">
                    {nota.tipo === 'NF-e' ? nota.numero : '-'}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-center">
                    {nota.numeroCTe || '-'}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate text-sm" title={nota.material}>
                    {nota.material}
                  </TableCell>

                  <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                    {formatCurrency(nota.valorTotal)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap">
                    {formatPercent(nota.aliquotaPIS)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap">
                    {formatCurrency(nota.valorPIS)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatPercent(nota.aliquotaCOFINS)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap">
                    {formatCurrency(nota.valorCOFINS)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatPercent(nota.aliquotaIPI)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap">
                    {formatCurrency(nota.valorIPI)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatPercent(nota.aliquotaICMS)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap">
                    {formatCurrency(nota.valorICMS)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatPercent(nota.aliquotaDIFAL)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap">
                    {formatCurrency(nota.valorDIFAL)}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {nota.dataEmissao ? nota.dataEmissao.split('/')[2] : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {nota.reducaoICMS > 0 ? 'Sim' : 'Não'}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {nota.dataEmissao ? nota.dataEmissao.split('/')[1] : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground text-center whitespace-nowrap">
                    {nota.dataInsercao || ''}
                  </TableCell>
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger>
                        <span className={
                          nota.situacao === 'Ativa' ? 'text-success' : nota.situacao === 'Cancelada' ? 'text-destructive' : nota.situacao === 'Negada' ? 'text-destructive' : 'text-muted-foreground'
                        }>
                          {nota.situacao || 'Desconhecida'}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          <div><strong>Código:</strong> {nota.situacaoInfo?.cStat || '—'}</div>
                          <div><strong>Motivo:</strong> {nota.situacaoInfo?.xMotivo || '—'}</div>
                          <div><strong>Protocolo:</strong> {nota.situacaoInfo?.nProt || '—'}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground text-center whitespace-nowrap">
                    {nota.dataMudancaSituacao || '—'}
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </motion.div>
  );
}
