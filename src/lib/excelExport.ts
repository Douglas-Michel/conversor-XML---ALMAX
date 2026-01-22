import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { NotaFiscal, formatPercent } from './xmlParser';

function getTodayBRDate(): string {
  // Local browser date (avoids UTC shift from toISOString)
  return format(new Date(), 'dd/MM/yyyy');
}

export function exportToExcel(notas: NotaFiscal[], fileName: string = 'notas_fiscais') {
  const today = getTodayBRDate();

  // Normalize notas: garantir que expectedPIS/COFINS estejam preenchidos usando fallback (soma por item já é preferida no parser)
  const normalizedNotas = notas.map(n => ({ ...n }));
  normalizedNotas.forEach(n => {
    // PIS fallback: se não houver expectedPIS, tenta base declarada, senão aliquota * total
    if (n.expectedPIS === undefined || n.expectedPIS === null) {
      const aliq = (n.declaredPIS !== undefined ? n.declaredPIS : n.aliquotaPIS) || 0;
      if (n.basePIS && n.basePIS > 0 && aliq > 0) n.expectedPIS = n.basePIS * (aliq / 100);
      else n.expectedPIS = n.valorTotal * (aliq / 100);
    }
    // COFINS fallback
    if (n.expectedCOFINS === undefined || n.expectedCOFINS === null) {
      const aliq = (n.declaredCOFINS !== undefined ? n.declaredCOFINS : n.aliquotaCOFINS) || 0;
      if (n.baseCOFINS && n.baseCOFINS > 0 && aliq > 0) n.expectedCOFINS = n.baseCOFINS * (aliq / 100);
      else n.expectedCOFINS = n.valorTotal * (aliq / 100);
    }
  });

  // Helper function to convert dd/MM/yyyy string to Excel serial date number
  const parseDate = (dateStr: string): Date | string => {
    if (!dateStr) return '';
    const [day, month, year] = dateStr.split('/');
    if (!day || !month || !year) return '';
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  // Main sheet: keep same columns/order as the UI table for visual parity
  const data = normalizedNotas.map((nota) => ({
    'DATA EMISSÃO': parseDate(nota.dataEmissao || today),
    'TIPO NF': nota.tipoOperacao?.toUpperCase() || '',
    'FORNECEDOR/CLIENTE': nota.fornecedorCliente?.toUpperCase() || '',
    'Nº NF-E': nota.tipo === 'NF-e' ? nota.numero : '',
    'Nº CT-E': nota.numeroCTe || '',
    'MATERIAL': nota.material?.toUpperCase() || '',
    'VALOR': nota.valorTotal,
    'ALÍQ. PIS': nota.aliquotaPIS !== undefined ? nota.aliquotaPIS / 100 : null,
    'PIS': nota.valorPIS,
    'ALÍQ. COF': nota.aliquotaCOFINS !== undefined ? nota.aliquotaCOFINS / 100 : null,
    'COFINS': nota.valorCOFINS,
    'ALÍQ. IPI': nota.aliquotaIPI !== undefined ? nota.aliquotaIPI / 100 : null,
    'IPI': nota.valorIPI,
    'ALÍQ. ICMS': nota.aliquotaICMS !== undefined ? nota.aliquotaICMS / 100 : null,
    'ICMS': nota.valorICMS,
    'ALÍQ. DIFAL': nota.aliquotaDIFAL !== undefined ? nota.aliquotaDIFAL / 100 : null,
    'DIFAL': nota.valorDIFAL,
    'ANO': nota.dataEmissao ? new Date(nota.dataEmissao.split('/').reverse().join('-')).getFullYear() : '',
    'REDUZ ICMS': '',
    'MÊS': nota.dataEmissao ? new Date(nota.dataEmissao.split('/').reverse().join('-')).getMonth() + 1 : '',
    'DATA INSERÇÃO': parseDate(nota.dataInsercao || today),
    'SITUAÇÃO': (nota.situacao || 'Desconhecida').toUpperCase(),
    'DATA MUDANÇA': parseDate(nota.dataMudancaSituacao || ''),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data, { cellDates: true, dateNF: 'dd/mm/yyyy' });

  // Aplicar formatação às colunas
  const ref = worksheet['!ref'];
  if (ref) {
    const range = XLSX.utils.decode_range(ref);
    const currencyHeaders = ['VALOR', 'PIS', 'COFINS', 'IPI', 'ICMS', 'DIFAL', 'PIS ESPERADO', 'COFINS ESPERADO'];
    const percentHeaders = ['ALÍQ. PIS', 'ALÍQ. COF', 'ALÍQ. IPI', 'ALÍQ. ICMS', 'ALÍQ. DIFAL'];
    const numberHeaders = ['Nº NF-E', 'Nº CT-E', 'ANO', 'MÊS'];
    
    // Centralizar cabeçalhos
    for (let c = range.s.c; c <= range.e.c; c++) {
      const headerAddr = XLSX.utils.encode_cell({ c, r: range.s.r });
      const headerCell = worksheet[headerAddr];
      if (headerCell) {
        if (!headerCell.s) headerCell.s = {};
        headerCell.s.alignment = { horizontal: 'center', vertical: 'center' };
      }
    }
    
    // Formatar valores monetários, alíquotas, números e datas
    for (let c = range.s.c; c <= range.e.c; c++) {
      const headerAddr = XLSX.utils.encode_cell({ c, r: range.s.r });
      const headerCell = worksheet[headerAddr];
      if (!headerCell || !headerCell.v) continue;
      const header = String(headerCell.v);
      
      if (currencyHeaders.includes(header)) {
        for (let r = range.s.r + 1; r <= range.e.r; r++) {
          const addr = XLSX.utils.encode_cell({ c, r });
          const cell = worksheet[addr];
          if (cell && typeof cell.v === 'number') {
            cell.z = '[$R$-pt-BR] #,##0.00';
          }
        }
      }
      
      if (percentHeaders.includes(header)) {
        for (let r = range.s.r + 1; r <= range.e.r; r++) {
          const addr = XLSX.utils.encode_cell({ c, r });
          const cell = worksheet[addr];
          if (cell && typeof cell.v === 'number') {
            cell.z = '0.00%';
            if (!cell.s) cell.s = {};
            cell.s.alignment = { horizontal: 'center', vertical: 'center' };
          }
        }
      }
      
      if (numberHeaders.includes(header)) {
        for (let r = range.s.r + 1; r <= range.e.r; r++) {
          const addr = XLSX.utils.encode_cell({ c, r });
          const cell = worksheet[addr];
          if (cell && cell.v !== undefined && cell.v !== '') {
            cell.t = 'n';
            cell.z = '0';
          }
        }
      }
    }
  }

  const columnWidths = [
    { wch: 12 },  // Data Emissão
    { wch: 10 },  // Tipo NF
    { wch: 40 },  // Fornecedor/Cliente
    { wch: 12 },  // Nº NF-e
    { wch: 12 },  // Nº CT-e
    { wch: 40 },  // Material
    { wch: 15 },  // Valor
    { wch: 10 },  // Alíq. PIS
    { wch: 12 },  // PIS
    { wch: 10 },  // Alíq. COF
    { wch: 12 },  // COFINS
    { wch: 10 },  // Alíq. IPI
    { wch: 12 },  // IPI
    { wch: 10 },  // Alíq. ICMS
    { wch: 12 },  // ICMS
    { wch: 10 },  // Alíq. DIFAL
    { wch: 12 },  // DIFAL
    { wch: 8 },   // ANO
    { wch: 10 },  // Reduz ICMS
    { wch: 6 },   // MÊS
    { wch: 12 },  // Data Inserção
    { wch: 14 },  // Situação
    { wch: 12 },  // Data Mudança
  ];
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Notas Fiscais');

  const summary = createSummary(notas);
  const summarySheet = XLSX.utils.json_to_sheet(summary);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 18 }];
  
  // Centralizar cabeçalhos da aba Resumo
  const summaryRef = summarySheet['!ref'];
  if (summaryRef) {
    const summaryRange = XLSX.utils.decode_range(summaryRef);
    for (let c = summaryRange.s.c; c <= summaryRange.e.c; c++) {
      const headerAddr = XLSX.utils.encode_cell({ c, r: summaryRange.s.r });
      const headerCell = summarySheet[headerAddr];
      if (headerCell) {
        if (!headerCell.s) headerCell.s = {};
        headerCell.s.alignment = { horizontal: 'center', vertical: 'center' };
      }
    }
    
    // Formatar coluna VALOR com formato contábil
    for (let c = summaryRange.s.c; c <= summaryRange.e.c; c++) {
      const headerAddr = XLSX.utils.encode_cell({ c, r: summaryRange.s.r });
      const headerCell = summarySheet[headerAddr];
      if (headerCell && String(headerCell.v) === 'VALOR') {
        for (let r = summaryRange.s.r + 1; r <= summaryRange.e.r; r++) {
          const addr = XLSX.utils.encode_cell({ c, r });
          const cell = summarySheet[addr];
          if (cell && typeof cell.v === 'number') {
            cell.z = '[$R$-pt-BR] #,##0.00';
          }
        }
      }
    }
  }
  
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

  // Reconciliation sheet
  const reconc = createReconciliation(normalizedNotas);
  const reconcSheet = XLSX.utils.json_to_sheet(reconc);
  // auto-width simple heuristic
  reconcSheet['!cols'] = Array(Object.keys(reconc[0] || {}).length).fill({ wch: 18 });

  // Format reconciliation sheet (percent/currency hints)
  try {
    const rRef = reconcSheet['!ref'];
    if (rRef) {
      const rRange = XLSX.utils.decode_range(rRef);
      
      // Centralizar cabeçalhos da aba Reconciliação
      for (let c = rRange.s.c; c <= rRange.e.c; c++) {
        const headerAddr = XLSX.utils.encode_cell({ c, r: rRange.s.r });
        const headerCell = reconcSheet[headerAddr];
        if (headerCell) {
          if (!headerCell.s) headerCell.s = {};
          headerCell.s.alignment = { horizontal: 'center', vertical: 'center' };
        }
      }
      
      const currencyHeaders = ['VALOR', 'PIS ATUAL', 'PIS ESPERADO', 'COFINS ATUAL', 'COFINS ESPERADO', 'IPI ATUAL', 'IPI ESPERADO', 'ICMS ATUAL', 'ICMS ESPERADO'];
      const percentHeadersRec: string[] = []; // none expected here as decimals are in currency form
      for (let c = rRange.s.c; c <= rRange.e.c; c++) {
        const headerAddr = XLSX.utils.encode_cell({ c, r: rRange.s.r });
        const headerCell = reconcSheet[headerAddr];
        if (!headerCell || !headerCell.v) continue;
        const header = String(headerCell.v);
        if (currencyHeaders.includes(header)) {
          for (let r = rRange.s.r + 1; r <= rRange.e.r; r++) {
            const addr = XLSX.utils.encode_cell({ c, r });
            const cell = reconcSheet[addr];
            if (cell && typeof cell.v === 'number') cell.z = '[$R$-pt-BR] #,##0.00';
          }
        }
      }
    }
  } catch {}

  XLSX.utils.book_append_sheet(workbook, reconcSheet, 'Reconciliacao');

  const timestamp = format(new Date(), 'yyyy-MM-dd');
  XLSX.writeFile(workbook, `${fileName}_${timestamp}.xlsx`, { cellStyles: true });
}

function createReconciliation(notas: NotaFiscal[]) {
  return notas.map(n => {
    const pisDiff = (n.valorPIS || 0) - (n.expectedPIS || 0);
    const cofDiff = (n.valorCOFINS || 0) - (n.expectedCOFINS || 0);
    const ipiDiff = (n.valorIPI || 0) - (n.expectedIPI || 0);
    const icmsDiff = (n.valorICMS || 0) - (n.expectedICMS || 0);

    const pisReason = n.expectedPIS && n.expectedPIS !== 0 ? (Math.abs(pisDiff) <= 0.1 ? 'ARREDONDAMENTO' : (n.expectedPIS === sumDetValuesSafe(n, 'vPIS') ? 'SOMA POR ITEM' : (n.declaredPIS ? 'ALÍQUOTA DECLARADA SOBRE BASE' : 'PERCENTUAL SOBRE TOTAL'))) : 'SEM DADOS';
    const cofReason = n.expectedCOFINS && n.expectedCOFINS !== 0 ? (Math.abs(cofDiff) <= 0.1 ? 'ARREDONDAMENTO' : (n.expectedCOFINS === sumDetValuesSafe(n, 'vCOFINS') ? 'SOMA POR ITEM' : (n.declaredCOFINS ? 'ALÍQUOTA DECLARADA SOBRE BASE' : 'PERCENTUAL SOBRE TOTAL'))) : 'SEM DADOS';
    const ipiReason = Math.abs(ipiDiff) <= 0.1 ? 'OK/ARREDONDAMENTO' : 'DIFERENÇA';
    const icmsReason = Math.abs(icmsDiff) <= 0.1 ? 'OK/ARREDONDAMENTO' : 'DIFERENÇA';

    return {
      'CHAVE': n.chaveAcesso,
      'Nº NF': n.numero,
      'FORNECEDOR': n.fornecedorCliente?.toUpperCase() || '',
      'VALOR': n.valorTotal,
      'PIS ATUAL': n.valorPIS,
      'PIS ESPERADO': n.expectedPIS || 0,
      'PIS DIF': pisDiff,
      'PIS MOTIVO': pisReason.toUpperCase(),
      'COFINS ATUAL': n.valorCOFINS,
         'COFINS ESPERADO': n.expectedCOFINS || 0,
      'COFINS DIF': cofDiff,
      'COFINS MOTIVO': cofReason.toUpperCase(),
      'IPI ATUAL': n.valorIPI,
      'IPI ESPERADO': n.expectedIPI || 0,
      'IPI DIF': ipiDiff,
      'IPI MOTIVO': ipiReason.toUpperCase(),
      'ICMS ATUAL': n.valorICMS,
      'ICMS ESPERADO': n.expectedICMS || 0,
      'ICMS DIF': icmsDiff,
      'ICMS MOTIVO': icmsReason.toUpperCase(),
    };
  });
}

// Helper that can be called without access to XML; fallback returns 0
function sumDetValuesSafe(n: NotaFiscal, tag: string) {
  // This helper can't access the original doc, so try to infer from expected vs value
  return 0;
}

function createSummary(notas: NotaFiscal[]) {
  const totalNotas = notas.length;
  const totalNFe = notas.filter(n => n.tipo === 'NF-e').length;
  const totalCTe = notas.filter(n => n.tipo === 'CT-e').length;
  const entradas = notas.filter(n => n.tipoOperacao === 'Entrada');
  const saidas = notas.filter(n => n.tipoOperacao === 'Saída');
  
  const sumValues = (arr: NotaFiscal[]) => ({
    total: arr.reduce((sum, n) => sum + n.valorTotal, 0),
    icms: arr.reduce((sum, n) => sum + n.valorICMS, 0),
    pis: arr.reduce((sum, n) => sum + n.valorPIS, 0),
    cofins: arr.reduce((sum, n) => sum + n.valorCOFINS, 0),
    ipi: arr.reduce((sum, n) => sum + n.valorIPI, 0),
    difal: arr.reduce((sum, n) => sum + n.valorDIFAL, 0),
  });

  const totaisEntrada = sumValues(entradas);
  const totaisSaida = sumValues(saidas);

  return [
    { 'DESCRIÇÃO': 'Total de Documentos', 'VALOR': totalNotas },
    { 'DESCRIÇÃO': 'Total NF-e', 'VALOR': totalNFe },
    { 'DESCRIÇÃO': 'Total CT-e', 'VALOR': totalCTe },
    { 'DESCRIÇÃO': '', 'VALOR': '' },
    { 'DESCRIÇÃO': '--- ENTRADAS ---', 'VALOR': '' },
    { 'DESCRIÇÃO': 'Qtd. Entradas', 'VALOR': entradas.length },
    { 'DESCRIÇÃO': 'Valor Total Entradas', 'VALOR': totaisEntrada.total },
    { 'DESCRIÇÃO': 'ICMS Entradas', 'VALOR': totaisEntrada.icms },
    { 'DESCRIÇÃO': 'PIS Entradas', 'VALOR': totaisEntrada.pis },
    { 'DESCRIÇÃO': 'COFINS Entradas', 'VALOR': totaisEntrada.cofins },
    { 'DESCRIÇÃO': 'IPI Entradas', 'VALOR': totaisEntrada.ipi },
    { 'DESCRIÇÃO': 'DIFAL Entradas', 'VALOR': totaisEntrada.difal },
    { 'DESCRIÇÃO': '', 'VALOR': '' },
    { 'DESCRIÇÃO': '--- SAÍDAS ---', 'VALOR': '' },
    { 'DESCRIÇÃO': 'Qtd. Saídas', 'VALOR': saidas.length },
    { 'DESCRIÇÃO': 'Valor Total Saídas', 'VALOR': totaisSaida.total },
    { 'DESCRIÇÃO': 'ICMS Saídas', 'VALOR': totaisSaida.icms },
    { 'DESCRIÇÃO': 'PIS Saídas', 'VALOR': totaisSaida.pis },
    { 'DESCRIÇÃO': 'COFINS Saídas', 'VALOR': totaisSaida.cofins },
    { 'DESCRIÇÃO': 'IPI Saídas', 'VALOR': totaisSaida.ipi },
    { 'DESCRIÇÃO': 'DIFAL Saídas', 'VALOR': totaisSaida.difal },
  ];
}