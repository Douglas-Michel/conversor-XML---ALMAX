/**
 * @fileoverview Parser de XMLs de documentos fiscais eletrônicos (NF-e e CT-e)
 * Processa XMLs conforme layout da Receita Federal e SEFAZ, extraindo dados estruturados
 * para análise e exportação.
 * 
 * @author Sistema de Gestão Fiscal
 * @version 2.0.0
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Status do documento fiscal eletrônico segundo protocolo SEFAZ
 */
export type SituacaoDocumento = 'Ativa' | 'Cancelada' | 'Negada' | 'Rejeitada' | 'Desconhecida';

/**
 * Tipo de operação do documento
 */
export type TipoOperacao = 'Entrada' | 'Saída';

/**
 * Tipo de documento fiscal eletrônico
 */
export type TipoDocumento = 'NF-e' | 'CT-e';

/**
 * Informações do protocolo de autorização SEFAZ
 */
export interface ProtocoloInfo {
  cStat?: string;
  xMotivo?: string;
  nProt?: string;
}

/**
 * Estrutura completa de uma Nota Fiscal Eletrônica ou Conhecimento de Transporte Eletrônico
 */
export interface NotaFiscal {
  id: string;
  tipo: string; // Mudado de TipoDocumento para string para permitir "NF-e (Remessa)"
  tipoOperacao: TipoOperacao;
  numero: string;
  numeroCTe: string;
  serie: string;
  dataEmissao: string;
  fornecedorCliente: string;
  cnpjCpf: string;
  valorTotal: number;
  baseCalculoICMS: number;
  
  // Identificação de nota de remessa
  finNFe?: string; // Finalidade da NF-e: 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
  cfop?: string; // Código Fiscal de Operações e Prestações
  isRemessa?: boolean; // Flag para identificação de remessa (por finNFe, CFOP ou natureza)
  isAjusteEstorno?: boolean; // Flag para identificar notas de ajuste (finNFe=3) ou devolução/estorno (finNFe=4)
  
  // Tributos PIS
  aliquotaPIS: number;
  flagPIS: boolean;
  valorPIS: number;
  
  // Tributos COFINS
  aliquotaCOFINS: number;
  flagCOFINS: boolean;
  valorCOFINS: number;
  
  // Tributos IPI
  aliquotaIPI: number;
  flagIPI: boolean;
  valorIPI: number;
  
  // Tributos ICMS
  aliquotaICMS: number;
  flagICMS: boolean;
  valorICMS: number;
  
  // DIFAL (Diferencial de Alíquota)
  aliquotaDIFAL: number;
  valorDIFAL: number;
  
  // Informações complementares
  reducaoICMS: number;
  chaveAcesso: string;
  nfeReferenciada: string;
  cteReferenciado: string;
  chaveReferenciada: string;
  material: string;
  
  // Validações (verificação de consistência dos cálculos)
  verifiedPIS?: boolean;
  verifiedCOFINS?: boolean;
  verifiedIPI?: boolean;
  verifiedICMS?: boolean;
  
  // Valores esperados (para auditoria e debug)
  expectedPIS?: number;
  expectedCOFINS?: number;
  expectedIPI?: number;
  expectedICMS?: number;
  
  // Bases de cálculo e alíquotas declaradas
  basePIS?: number;
  baseCOFINS?: number;
  baseIPI?: number;
  declaredPIS?: number;
  declaredCOFINS?: number;
  declaredIPI?: number;
  
  // Metadados
  dataInsercao?: string;
  situacao?: SituacaoDocumento;
  situacaoInfo?: ProtocoloInfo;
  dataMudancaSituacao?: string;
  isCancellationFile?: boolean;
}

/**
 * Resumo de agregação de tributos PIS/COFINS por item
 */
interface TaxAggregation {
  base: number;
  value: number;
  declaredPctWeighted: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Alíquota IPI padrão (regra de negócio fixa)
 */
const DEFAULT_IPI_RATE = 3.25;

/**
 * Alíquota PIS padrão (fallback quando não declarada)
 */
const DEFAULT_PIS_RATE = 1.65;

/**
 * Alíquota COFINS padrão (fallback quando não declarada)
 */
const DEFAULT_COFINS_RATE = 7.6;

/**
 * Alíquota interna padrão de ICMS por UF para inferência de DIFAL quando o XML
 * não traz o grupo explícito de partilha/destino.
 */
const INTERNAL_ICMS_RATE_BY_UF: Record<string, number> = {
  AC: 17,
  AL: 19,
  AM: 20,
  AP: 18,
  BA: 20.5,
  CE: 20,
  DF: 20,
  ES: 17,
  GO: 19,
  MA: 23,
  MG: 18,
  MS: 17,
  MT: 17,
  PA: 19,
  PB: 20,
  PE: 20.5,
  PI: 21,
  PR: 19.5,
  RJ: 20,
  RN: 20,
  RO: 19.5,
  RR: 20,
  RS: 17,
  SC: 17,
  SE: 19,
  SP: 18,
  TO: 20,
};

/**
 * Tolerância para comparação de valores monetários (1% ou R$ 0,10 mínimo)
 */
const AMOUNT_TOLERANCE_PERCENT = 0.01;
const AMOUNT_TOLERANCE_MIN = 0.10;

/**
 * Tamanho padrão da chave de acesso de documentos fiscais
 */
const ACCESS_KEY_LENGTH = 44;

/**
 * Posição inicial do número do documento na chave de acesso (0-indexed)
 */
const DOC_NUMBER_START_POS = 25;

/**
 * Posição final do número do documento na chave de acesso (0-indexed)
 */
const DOC_NUMBER_END_POS = 34;

/**
 * Códigos de situação SEFAZ
 */
const SEFAZ_STATUS = {
  AUTORIZADA: '100',
  CANCELADA: '101',
  NEGADA_PREFIX: '3',
} as const;

/**
 * Limites para exibição de materiais
 */
const MAX_MATERIALS_DISPLAY = 1;

/**
 * CNPJs/CPFs da empresa usuária (para detecção de entrada/saída)
 * Adicione aqui os CNPJs da sua empresa para identificação correta
 */
const EMPRESA_CNPJS = [
  '07868543000174', // CNPJ ALMAX (07.868.543/0001-74)
  '07868543000155', // CNPJ ALMAX Filial (07.868.543/0001-55)
  // Adicione outros CNPJs/filiais se necessário
];

const EMPRESA_CNPJ_RAIZES = Array.from(
  new Set(
    EMPRESA_CNPJS
      .map(cnpj => cnpj.replace(/\D/g, ''))
      .filter(cnpj => cnpj.length === 14)
      .map(cnpj => cnpj.slice(0, 8))
  )
);

/**
 * Mapeamento de CFOPs para tipo de operação especial
 */
const CFOP_REMESSA = [
  // Remessa para demonstração
  '5915', '6915', '5916', '6916',
  // Remessa em consignação
  '5917', '6917', '5918', '6918', '5919', '6919',
  // Remessa para venda fora do estabelecimento
  '5904', '6904',
  // Remessa para depósito fechado ou armazém geral
  '5905', '6905', '5906', '6906',
  // Remessa de bem do ativo imobilizado
  '5551', '6551', '5552', '6552',
  // Remessa de amostra grátis
  '5911', '6911', '5912', '6912',
  // Outras saídas de mercadoria (quando relacionadas a remessa)
  '5949', '6949',
  // Remessa para industrialização
  '5901', '6901', '5902', '6902', '5903', '6903',
  // Remessa para depósito ou armazém
  '5907', '6907', '5908', '6908',
];

const CFOP_DEVOLUCAO = [
  // Devolução de compra
  '5201', '6201', '5202', '6202', '5209', '6209', '5210', '6210',
  // Devolução de venda
  '1201', '2201', '1202', '2202', '1209', '2209', '1210', '2210',
  // Devolução de consignação
  '1918', '2918', '1919', '2919',
  // Devolução de remessa
  '1916', '2916', '1917', '2917',
  // Devolução de industrialização
  '1902', '2902', '1903', '2903',
  // Outras devoluções
  '5410', '6410', '5411', '6411', '5412', '6412', '5413', '6413',
  '1410', '2410', '1411', '2411', '1414', '2414', '1415', '2415',
];

/**
 * Detecta se um CNPJ pertence à empresa usuária
 */
function isCnpjDaEmpresa(cnpj: string): boolean {
  if (!cnpj) return false;
  const cnpjLimpo = cnpj.replace(/\D/g, '');

  // CPF: compara apenas por igualdade exata com os cadastrados
  if (cnpjLimpo.length === 11) {
    return EMPRESA_CNPJS.some(empresaCnpj => cnpjLimpo === empresaCnpj.replace(/\D/g, ''));
  }

  // CNPJ: considera igualdade exata e também raiz (matriz/filiais)
  if (cnpjLimpo.length === 14) {
    const matchExato = EMPRESA_CNPJS.some(empresaCnpj => cnpjLimpo === empresaCnpj.replace(/\D/g, ''));
    if (matchExato) return true;

    const raiz = cnpjLimpo.slice(0, 8);
    return EMPRESA_CNPJ_RAIZES.includes(raiz);
  }

  return false;
}

function normalizeOperationText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferOperationFromCFOP(cfop: string): TipoOperacao | null {
  if (!cfop) return null;
  const cfopLimpo = cfop.replace(/\D/g, '');
  const primeiroDigito = cfopLimpo.charAt(0);

  if (primeiroDigito === '1' || primeiroDigito === '2' || primeiroDigito === '3') return 'Entrada';
  if (primeiroDigito === '5' || primeiroDigito === '6' || primeiroDigito === '7') return 'Saída';

  return null;
}

function inferOperationFromNatOp(natOp: string): TipoOperacao | null {
  const normalized = normalizeOperationText(natOp);
  if (!normalized) return null;

  if (normalized.includes('devolucao de venda')) return 'Entrada';
  if (normalized.includes('devolucao de compra')) return 'Saída';

  if (
    normalized.includes('compra') ||
    normalized.includes('aquisicao') ||
    normalized.includes('entrada') ||
    normalized.includes('retorno')
  ) {
    return 'Entrada';
  }

  if (
    normalized.includes('venda') ||
    normalized.includes('remessa') ||
    normalized.includes('saida')
  ) {
    return 'Saída';
  }

  return null;
}

function identificarTipoPorNatureza(natOp: string): 'remessa' | 'devolucao' | 'ajuste' | 'normal' {
  const normalized = normalizeOperationText(natOp);
  if (!normalized) return 'normal';

  if (normalized.includes('remessa')) return 'remessa';
  if (normalized.includes('devolucao') || normalized.includes('estorno')) return 'devolucao';
  if (normalized.includes('ajuste') || normalized.includes('complement')) return 'ajuste';

  return 'normal';
}

/**
 * Identifica tipo de operação especial pelo CFOP
 */
function identificarTipoPorCFOP(cfop: string): 'remessa' | 'devolucao' | 'normal' {
  if (!cfop) return 'normal';
  const cfopLimpo = cfop.replace(/\D/g, '');
  
  if (CFOP_REMESSA.includes(cfopLimpo)) return 'remessa';
  if (CFOP_DEVOLUCAO.includes(cfopLimpo)) return 'devolucao';
  
  return 'normal';
}

/**
 * Trunca um número para exatamente 4 casas decimais (sem arredondamento)
 * Usado para alíquotas para mostrar precisão total
 * @param value - Valor a ser truncado
 * @returns Valor truncado com 4 casas decimais
 */
function truncateToFourDecimals(value: number): number {
  return Math.trunc(value * 10000) / 10000;
}

// ============================================================================
// XML DOM UTILITIES
// ============================================================================

/**
 * Busca elementos por localName ignorando namespaces
 * @param root - Elemento raiz para busca
 * @param tagName - Nome da tag a buscar
 * @returns Array de elementos encontrados
 */
function getElementsByLocalName(root: Element | Document | null, tagName: string): Element[] {
  if (!root || !('getElementsByTagName' in root)) return [];

  // PRIORIDADE 1: getElementsByTagNameNS com wildcard de namespace (ignora namespace completamente)
  // Funciona mesmo quando o DOMParser mantém namespace internamente após parsing
  try {
    const byNS = (root as Element).getElementsByTagNameNS?.('*', tagName);
    if (byNS?.length) return Array.from(byNS);
  } catch { /* ignora se não suportado */ }

  // PRIORIDADE 2: Busca direta por nome de tag (sem namespace)
  const direct = (root as Element).getElementsByTagName(tagName);
  if (direct?.length) return Array.from(direct);

  // PRIORIDADE 3: Fallback case-insensitive por localName (varredura completa)
  const all = (root as Element).getElementsByTagName('*');
  const tagLower = tagName.toLowerCase();
  return Array.from(all).filter(el => el.localName?.toLowerCase() === tagLower);
}

/**
 * Busca o primeiro elemento por localName
 * 
 * @param root - Elemento raiz para busca
 * @param tagName - Nome da tag a buscar
 * @returns Primeiro elemento encontrado ou null
 */
function findElementByLocalName(root: Element | Document | null, tagName: string): Element | null {
  const list = getElementsByLocalName(root, tagName);
  return list[0] ?? null;
}

/**
 * Extrai conteúdo de texto de um elemento filho
 * 
 * @param element - Elemento pai
 * @param tagName - Nome da tag filha
 * @returns Texto extraído ou string vazia
 */
function getTextContent(element: Element | null, tagName: string): string {
  if (!element) return '';
  const node = findElementByLocalName(element, tagName);
  return node?.textContent?.trim() ?? '';
}

/**
 * Extrai conteúdo numérico de um elemento filho
 * 
 * @param element - Elemento pai
 * @param tagName - Nome da tag filha
 * @returns Número extraído ou 0
 */
function getNumericContent(element: Element | null, tagName: string): number {
  const text = getTextContent(element, tagName);
  const parsed = parseFloat(text);
  return isNaN(parsed) ? 0 : parsed;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function inferDifalForInterstateEntry(params: {
  tipoOperacao: TipoOperacao;
  idDest: string;
  destUF: string;
  baseICMS: number;
  valorICMS: number;
  aliquotaICMS: number;
  valorDIFAL: number;
  aliquotaDIFAL: number;
}): { valorDIFAL: number; aliquotaDIFAL: number } {
  const {
    tipoOperacao,
    idDest,
    destUF,
    baseICMS,
    valorICMS,
    aliquotaICMS,
    valorDIFAL,
    aliquotaDIFAL,
  } = params;

  if (valorDIFAL > 0 || aliquotaDIFAL > 0) {
    return { valorDIFAL, aliquotaDIFAL };
  }

  if (tipoOperacao !== 'Entrada' || idDest !== '2' || baseICMS <= 0) {
    return { valorDIFAL, aliquotaDIFAL };
  }

  const internalRate = INTERNAL_ICMS_RATE_BY_UF[destUF.toUpperCase()];
  if (!internalRate || aliquotaICMS <= 0 || aliquotaICMS >= internalRate) {
    return { valorDIFAL, aliquotaDIFAL };
  }

  const inferredAliquotaDIFAL = roundToTwoDecimals(internalRate - aliquotaICMS);
  const inferredValorDIFAL = roundToTwoDecimals(baseICMS * (inferredAliquotaDIFAL / 100));

  if (inferredValorDIFAL <= 0) {
    return { valorDIFAL, aliquotaDIFAL };
  }

  if (valorICMS <= 0) {
    return { valorDIFAL: inferredValorDIFAL, aliquotaDIFAL: inferredAliquotaDIFAL };
  }

  const maxReasonableRate = 25;
  if (inferredAliquotaDIFAL > maxReasonableRate) {
    return { valorDIFAL, aliquotaDIFAL };
  }

  return {
    valorDIFAL: inferredValorDIFAL,
    aliquotaDIFAL: inferredAliquotaDIFAL,
  };
}

// ============================================================================
// CALCULATION UTILITIES
// ============================================================================

/**
 * Compara dois valores monetários com tolerância configurável
 * Tolerância: 1% do valor esperado ou R$ 0,10 (o que for maior)
 * 
 * @param actual - Valor real
 * @param expected - Valor esperado
 * @returns true se valores estão dentro da tolerância
 */
function amountsClose(actual: number, expected: number): boolean {
  const diff = Math.abs((actual || 0) - (expected || 0));
  const tolerance = Math.max(AMOUNT_TOLERANCE_MIN, Math.abs(expected) * AMOUNT_TOLERANCE_PERCENT);
  return diff <= tolerance;
}

/**
 * Soma valores de uma tag específica em todos os itens (det) do documento
 * @param doc - Documento XML
 * @param tagName - Nome da tag a somar (ex: vPIS, vCOFINS, vIPI, vICMS)
 * @returns Soma total dos valores encontrados
 */
function sumDetValues(doc: Element | null, tagName: string): number {
  if (!doc) return 0;
  
  const dets = getElementsByLocalName(doc, 'det');
  let sum = 0;
  
  for (const det of dets) {
    const imposto = findElementByLocalName(det, 'imposto');
    if (!imposto) continue;
    
    let valor = 0;
    
    switch (tagName) {
      case 'vPIS': {
        const pis = findElementByLocalName(imposto, 'PIS');
        const variants = ['PISAliq', 'PISOutr', 'PISNT', 'PISST', 'PISQtde'];
        for (const v of variants) {
          const elem = findElementByLocalName(pis || imposto, v);
          if (elem) {
            valor = getNumericContent(elem, 'vPIS');
            if (valor > 0) break;
          }
        }
        break;
      }
      case 'vCOFINS': {
        const cofins = findElementByLocalName(imposto, 'COFINS');
        const variants = ['COFINSAliq', 'COFINSOutr', 'COFINSNT', 'COFINSST', 'COFINSQtde'];
        for (const v of variants) {
          const elem = findElementByLocalName(cofins || imposto, v);
          if (elem) {
            valor = getNumericContent(elem, 'vCOFINS');
            if (valor > 0) break;
          }
        }
        break;
      }
      case 'vIPI': {
        const ipi = findElementByLocalName(imposto, 'IPI');
        if (ipi) {
          const elem = findElementByLocalName(ipi, 'IPITrib') || findElementByLocalName(ipi, 'IPINT');
          if (elem) valor = getNumericContent(elem, 'vIPI');
        }
        break;
      }
      case 'vICMS': {
        const icms = findElementByLocalName(imposto, 'ICMS');
        if (icms?.children.length) {
          valor = getNumericContent(icms.children[0], 'vICMS');
        }
        break;
      }
    }
    
    sum += valor;
  }
  
  return sum;
}

/**
 * Agrega bases e valores de PIS/COFINS considerando diferentes regimes tributários
 * Calcula alíquota média ponderada pela base de cálculo
 * 
 * Regimes suportados:
 * - PISAliq / COFINSAliq: Tributação normal (alíquota sobre base)
 * - PISOutr / COFINSOutr: Outras operações
 * - PISNT / COFINSNT: Não tributado
 * - PISST / COFINSST: Substituição tributária
 * 
 * @param doc - Documento XML
 * @param tax - Tipo de tributo (PIS ou COFINS)
 * @returns Agregação com base, valor total e alíquota ponderada
 */
function aggregatePisCofins(doc: Element | null, tax: 'PIS' | 'COFINS'): TaxAggregation {
  if (!doc) {
    return { base: 0, value: 0, declaredPctWeighted: 0 };
  }

  let totalBase = 0;
  let totalValue = 0;
  let weightedPercentSum = 0;
  
  const valueTag = tax === 'PIS' ? 'vPIS' : 'vCOFINS';
  const percentTag = tax === 'PIS' ? 'pPIS' : 'pCOFINS';
  
  const dets = getElementsByLocalName(doc, 'det');
  
  for (const det of dets) {
    const imp = findElementByLocalName(det, 'imposto');
    if (!imp) continue;
    
    const taxNode = findElementByLocalName(imp, tax);
    if (!taxNode) continue;

    // Sempre soma o valor efetivo do tributo
    totalValue += getNumericContent(taxNode, valueTag);

    // Processa diferentes regimes tributários
    const aliqNode = findElementByLocalName(taxNode, `${tax}Aliq`);
    const outrNode = findElementByLocalName(taxNode, `${tax}Outr`);

    if (aliqNode) {
      const base = getNumericContent(aliqNode, 'vBC');
      const percent = getNumericContent(aliqNode, percentTag);
      
      totalBase += base;
      if (base > 0 && percent > 0) {
        weightedPercentSum += percent * base;
      }
    } else if (outrNode) {
      // Regime de outras operações pode ter base+% ou quantidade*alíquota
      const base = getNumericContent(outrNode, 'vBC');
      const percent = getNumericContent(outrNode, percentTag);
      
      if (base > 0) {
        totalBase += base;
        if (percent > 0) {
          weightedPercentSum += percent * base;
        }
      }
    }
  }

  const declaredPctWeighted = totalBase > 0 ? (weightedPercentSum / totalBase) : 0;
  
  return { 
    base: totalBase, 
    value: totalValue, 
    declaredPctWeighted 
  };
}

/**
 * Agrega bases e valores de IPI considerando diferentes regimes tributários
 * Calcula alíquota média ponderada pela base de cálculo
 * 
 * Regimes suportados:
 * - IPITrib: IPI Tributado (alíquota sobre base)
 * - IPINT: IPI Não Tributado
 * 
 * @param doc - Documento XML
 * @returns Agregação com base, valor total e alíquota ponderada
 */
function aggregateIPI(doc: Element | null): TaxAggregation {
  if (!doc) {
    return { base: 0, value: 0, declaredPctWeighted: 0 };
  }

  let totalBase = 0;
  let totalValue = 0;
  let weightedPercentSum = 0;
  
  const dets = getElementsByLocalName(doc, 'det');
  
  for (const det of dets) {
    const imp = findElementByLocalName(det, 'imposto');
    if (!imp) continue;
    
    const ipiNode = findElementByLocalName(imp, 'IPI');
    if (!ipiNode) continue;

    // Processa IPI Tributado
    const ipiTrib = findElementByLocalName(ipiNode, 'IPITrib');
    if (ipiTrib) {
      const value = getNumericContent(ipiTrib, 'vIPI');
      const base = getNumericContent(ipiTrib, 'vBC');
      const percent = getNumericContent(ipiTrib, 'pIPI');
      
      totalValue += value;
      
      if (base > 0) {
        totalBase += base;
        if (percent > 0) {
          weightedPercentSum += percent * base;
        }
      }
    }
    
    // IPI Não Tributado também pode ter valor
    const ipiNT = findElementByLocalName(ipiNode, 'IPINT');
    if (ipiNT) {
      totalValue += getNumericContent(ipiNT, 'vIPI');
    }
  }

  const declaredPctWeighted = totalBase > 0 ? (weightedPercentSum / totalBase) : 0;
  
  return { 
    base: totalBase, 
    value: totalValue, 
    declaredPctWeighted 
  };
}

// ============================================================================
// XML CLEANING & NORMALIZATION
// ============================================================================

/**
 * Limpa e normaliza conteúdo XML para melhorar compatibilidade
 * @param content - Conteúdo XML bruto
 * @returns Conteúdo XML limpo
 */
function cleanXmlContent(content: string): string {
  if (!content) return content;
  
  return content
    .replace(/^\uFEFF/, '') // Remove BOM
    .replace(/<!--[\s\S]*?-->/g, '') // Remove comentários
    // Remove TODAS as declarações xmlns (default e prefixadas), com ou sem espaço antes
    .replace(/\s*xmlns(:\w+)?\s*=\s*"[^"]*"/g, '')
    .replace(/\s*xmlns(:\w+)?\s*=\s*'[^']*'/g, '')
    // Remove prefixos de namespace em nomes de elementos e atributos (ex: nfe:NFe → NFe)
    .replace(/<(\/?)[a-zA-Z][\w.-]*:([a-zA-Z][\w.-]*)/g, '<$1$2')
    // Remove prefixos em atributos (ex: xsi:type → type)
    .replace(/\s[a-zA-Z][\w.-]*:([a-zA-Z][\w.-]*)\s*=/g, ' $1=')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') // Remove caracteres inválidos
    .replace(/&(?!#?\w+;)/g, '&amp;') // Escapa & soltos
    .trim();
}

// ============================================================================
// DATA EXTRACTION & FORMATTING
// ============================================================================

/**
 * Extrai número do documento de uma chave de acesso
 * Posições 26-34 da chave (9 dígitos)
 * 
 * @param chave - Chave de acesso com 44 dígitos
 * @returns Número do documento sem zeros à esquerda
 */
function extrairNumeroDaChave(chave: string): string {
  if (!chave || chave.length !== ACCESS_KEY_LENGTH) return '';
  return chave.substring(DOC_NUMBER_START_POS, DOC_NUMBER_END_POS).replace(/^0+/, '');
}

/**
 * Formata data do padrão ISO para dd/mm/yyyy
 * 
 * @param dateStr - Data em formato ISO (yyyy-mm-ddThh:mm:ss)
 * @returns Data formatada ou string original se inválida
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-');
    
    if (year && month && day) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Formata CNPJ ou CPF com máscara apropriada
 */
function formatCnpjCpf(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}

/**
 * Formata valor numérico como moeda brasileira
 */
export function formatCurrency(value: number | undefined | null): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value ?? 0);
}

/**
 * Formata valor numérico como percentual
 */
export function formatPercent(value: number | undefined | null): string {
  return `${(value ?? 0).toFixed(2)}%`;
}

// ============================================================================
// DOCUMENT STATUS DETECTION
// ============================================================================

/**
 * Determina situação do documento baseado no código de status SEFAZ
 * 
 * @param cStat - Código de status do protocolo
 * @returns Situação do documento
 */
function determineSituacao(cStat: string): SituacaoDocumento {
  if (!cStat) return 'Desconhecida';
  if (cStat === SEFAZ_STATUS.AUTORIZADA) return 'Ativa';
  if (cStat === SEFAZ_STATUS.CANCELADA) return 'Cancelada';
  if (cStat.startsWith(SEFAZ_STATUS.NEGADA_PREFIX)) return 'Negada';
  return 'Rejeitada';
}

/**
 * Detecta tipo de operação (Entrada/Saída) em NF-e
 * 
 * LÓGICA CORRETA (PRIORIDADE):
 * 1. Papel da empresa no documento (emitente/destinatário)
 * 2. CFOP (1/2/3=Entrada, 5/6/7=Saída)
 * 3. Campo tpNF (perspectiva do emitente)
 * 4. Natureza da operação (natOp)
 * 
 * @param ide - Elemento ide do XML
 * @param emit - Elemento emit do XML
 * @param dest - Elemento dest do XML
 * @param cfop - CFOP do primeiro item
 * @param fileName - Nome do arquivo para log
 * @returns Tipo de operação detectado
 */
function detectNFeOperationType(
  ide: Element | null, 
  emit: Element | null, 
  dest: Element | null,
  cfop: string,
  fileName: string
): TipoOperacao {
  const natOp = getTextContent(ide, 'natOp');

  // PRIORIDADE 1: Papel da empresa no documento (perspectiva da empresa usuária)
  const cnpjEmit = (getTextContent(emit, 'CNPJ') || getTextContent(emit, 'CPF')).replace(/\D/g, '');
  const cnpjDest = (getTextContent(dest, 'CNPJ') || getTextContent(dest, 'CPF')).replace(/\D/g, '');

  const empresaEhEmitente = isCnpjDaEmpresa(cnpjEmit);
  const empresaEhDestinatario = isCnpjDaEmpresa(cnpjDest);

  const operacaoPorCfop = inferOperationFromCFOP(cfop);

  if (empresaEhEmitente && !empresaEhDestinatario) {
    if (operacaoPorCfop && operacaoPorCfop !== 'Saída') {
      console.warn(`Conflito de classificação em ${fileName}: empresa emitente, mas CFOP sugere Entrada`);
    }
    return 'Saída';
  }

  if (empresaEhDestinatario && !empresaEhEmitente) {
    if (operacaoPorCfop && operacaoPorCfop !== 'Entrada') {
      console.warn(`Conflito de classificação em ${fileName}: empresa destinatária, mas CFOP sugere Saída`);
    }
    return 'Entrada';
  }
  
  // PRIORIDADE 2: CFOP
  if (operacaoPorCfop) return operacaoPorCfop;

  // PRIORIDADE 3: Campo tpNF do XML (perspectiva do emitente)
  const tpNF = getTextContent(ide, 'tpNF').trim();
  if (tpNF === '0') return 'Entrada';
  if (tpNF === '1') return 'Saída';
  
  // PRIORIDADE 4: Natureza da operação (natOp)
  const operacaoPorNatOp = inferOperationFromNatOp(natOp);
  if (operacaoPorNatOp) return operacaoPorNatOp;
  
  // FALLBACK: Se nada funcionou, assume Saída
  console.warn(`Não foi possível determinar tipo de operação em ${fileName}, assumindo Saída`);
  return 'Saída';
}

/**
 * Detecta tipo de operação (Entrada/Saída) em CT-e
 * 
 * LÓGICA CORRETA:
 * - Se SUA empresa é o EMITENTE (transportador) = Nota de SAÍDA (você prestou serviço)
 * - Se SUA empresa é o TOMADOR/REMETENTE/DESTINATÁRIO = Nota de ENTRADA (você contratou)
 * - Se SUA empresa NÃO aparece = usa campo tpCTe do XML
 * 
 * @param ide - Elemento ide do XML
 * @param emit - Elemento emit do XML
 * @param rem - Elemento rem do XML
 * @param dest - Elemento dest do XML
 * @param exped - Elemento exped do XML
 * @param receb - Elemento receb do XML
 * @param toma - Elemento toma/toma4 do XML
 * @param fileName - Nome do arquivo para log
 * @returns Tipo de operação detectado
 */
function detectCTeOperationType(
  ide: Element | null, 
  emit: Element | null, 
  rem: Element | null,
  dest: Element | null,
  exped: Element | null,
  receb: Element | null,
  toma: Element | null,
  fileName: string
): TipoOperacao {
  // Obtém CNPJs
  const cnpjEmit = (getTextContent(emit, 'CNPJ') || getTextContent(emit, 'CPF')).replace(/\D/g, '');
  const cnpjRem = (getTextContent(rem, 'CNPJ') || getTextContent(rem, 'CPF')).replace(/\D/g, '');
  const cnpjDest = (getTextContent(dest, 'CNPJ') || getTextContent(dest, 'CPF')).replace(/\D/g, '');
  const cnpjExped = (getTextContent(exped, 'CNPJ') || getTextContent(exped, 'CPF')).replace(/\D/g, '');
  const cnpjReceb = (getTextContent(receb, 'CNPJ') || getTextContent(receb, 'CPF')).replace(/\D/g, '');
  const cnpjToma = (getTextContent(toma, 'CNPJ') || getTextContent(toma, 'CPF')).replace(/\D/g, '');
  
  // Verifica se a empresa usuária é o transportador (emitente) ou algum participante tomador/remetente/destinatário
  const empresaEhEmitente = isCnpjDaEmpresa(cnpjEmit);
  const empresaEhParticipanteNaoEmitente = [cnpjRem, cnpjDest, cnpjExped, cnpjReceb, cnpjToma]
    .filter(Boolean)
    .some(cnpj => isCnpjDaEmpresa(cnpj));
  
  // REGRA PRINCIPAL: Se identificamos a empresa
  if (empresaEhEmitente && !empresaEhParticipanteNaoEmitente) {
    // Empresa é transportador (emitente) = SAÍDA (você prestou serviço de transporte)
    return 'Saída';
  }
  
  if (empresaEhParticipanteNaoEmitente && !empresaEhEmitente) {
    // Empresa é tomador/remetente/destinatário/expedidor/recebedor = ENTRADA
    return 'Entrada';
  }

  if (empresaEhEmitente && empresaEhParticipanteNaoEmitente) {
    // Cenário raro (mesma empresa em múltiplos papéis): usa tipo de CT-e como desempate
    const tpCTeConflito = getTextContent(ide, 'tpCTe').trim();
    if (tpCTeConflito === '0') return 'Saída';
    return 'Entrada';
  }
  
  // FALLBACK: Empresa não identificada, usa campo tpCTe do XML
  const tpCTe = getTextContent(ide, 'tpCTe').trim();
  
  // tpCTe: 0=Normal (Saída), 1=Complementar, 2=Anulação, 3=Substituto
  if (tpCTe === '0') {
    console.warn(`tpCTe=0 (Normal/Saída) em CT-e de terceiro em ${fileName}`);
    return 'Saída';
  }
  
  // FALLBACK FINAL
  const participantes = [cnpjEmit, cnpjRem, cnpjDest, cnpjExped, cnpjReceb, cnpjToma].filter(Boolean);
  if (participantes.length >= 2 && new Set(participantes).size >= 2) {
    console.warn(`CT-e de terceiro sem identificação clara em ${fileName}, inferindo como Saída`);
    return 'Saída';
  }
  
  console.warn(`Não foi possível determinar tipo do CT-e em ${fileName}, assumindo Entrada`);
  return 'Entrada';
}

// ============================================================================
// MATERIAL EXTRACTION
// ============================================================================

/**
 * Extrai descrição dos produtos/materiais dos itens do documento
 * Retorna todos os produtos concatenados separados por ponto-e-vírgula
 * 
 * @param doc - Documento XML
 * @returns String com todos os materiais separados por ponto-e-vírgula
 */
function extractMaterials(doc: Element): string {
  const detsList = getElementsByLocalName(doc, 'det');
  const materiais: string[] = [];
  
  for (const det of detsList) {
    const prod = findElementByLocalName(det, 'prod');
    const nomeProd = prod ? getTextContent(prod, 'xProd') : getTextContent(det, 'xProd');
    
    if (nomeProd) {
      materiais.push(nomeProd);
    }
  }
  
  // Remove duplicatas
  const unique = Array.from(new Set(materiais)).filter(Boolean);
  
  if (unique.length === 0) return '';
  
  // Retorna todos os produtos separados por ponto-e-vírgula
  return unique.join('; ');
}

// ============================================================================
// REFERENCED DOCUMENTS
// ============================================================================

/**
 * Extrai documentos referenciados em NF-e
 * 
 * @param ide - Elemento ide do XML
 * @returns Objeto com NFe/CTe referenciadas
 */
function extractReferencedNFe(ide: Element | null): {
  nfeReferenciada: string;
  cteReferenciado: string;
  chaveReferenciada: string;
} {
  let nfeReferenciada = '';
  let cteReferenciado = '';
  let chaveReferenciada = '';
  
  const nfRefs = getElementsByLocalName(ide, 'NFref');
  
  for (const nfRef of nfRefs) {
    const refNFe = getTextContent(nfRef, 'refNFe');
    const refCTe = getTextContent(nfRef, 'refCTe');
    
    if (refNFe) {
      chaveReferenciada = refNFe;
      nfeReferenciada = extrairNumeroDaChave(refNFe);
      break;
    }
    
    if (refCTe) {
      chaveReferenciada = refCTe;
      cteReferenciado = extrairNumeroDaChave(refCTe);
      break;
    }
  }
  
  return { nfeReferenciada, cteReferenciado, chaveReferenciada };
}

/**
 * Extrai NF-e referenciada em CT-e
 * 
 * @param doc - Documento XML
 * @returns Objeto com NFe referenciada
 */
function extractReferencedCTe(doc: Element): {
  nfeReferenciada: string;
  chaveReferenciada: string;
} {
  let nfeReferenciada = '';
  let chaveReferenciada = '';
  
  const infDoc = findElementByLocalName(doc, 'infDoc');
  if (infDoc) {
    const infNFe = findElementByLocalName(infDoc, 'infNFe');
    if (infNFe) {
      const chave = getTextContent(infNFe, 'chave');
      if (chave) {
        chaveReferenciada = chave;
        nfeReferenciada = extrairNumeroDaChave(chave);
      }
    }
  }
  
  return { nfeReferenciada, chaveReferenciada };
}

// ============================================================================
// PROTOCOL INFORMATION
// ============================================================================

/**
 * Extrai informações do protocolo de autorização SEFAZ
 * 
 * @param doc - Documento XML
 * @param protName - Nome do elemento protocolo (protNFe ou protCTe)
 * @returns Situação e informações do protocolo
 */
function extractProtocol(doc: Element, protName: string): {
  situacao: SituacaoDocumento;
  situacaoInfo?: ProtocoloInfo;
  dataMudancaSituacao?: string;
} {
  const prot = findElementByLocalName(doc, protName) 
    || findElementByLocalName(doc.ownerDocument, protName) 
    || null;
    
  const infProt = prot ? (findElementByLocalName(prot, 'infProt') || prot) : null;
  
  const cStat = getTextContent(infProt, 'cStat');
  const xMotivo = getTextContent(infProt, 'xMotivo');
  const nProt = getTextContent(infProt, 'nProt');
  const dhRecbto = getTextContent(infProt, 'dhRecbto');

  const situacao = determineSituacao(cStat);
  const situacaoInfo = (cStat || xMotivo || nProt) 
    ? { cStat: cStat || undefined, xMotivo: xMotivo || undefined, nProt: nProt || undefined } 
    : undefined;
  
  // Captura data de mudança de situação (cancelamento, negação, etc)
  const dataMudancaSituacao = (situacao !== 'Ativa' && dhRecbto) ? formatDate(dhRecbto) : undefined;

  return { situacao, situacaoInfo, dataMudancaSituacao };
}

// ============================================================================
// MAIN PARSERS: NF-e
// ============================================================================

/**
 * Parser principal para NF-e (Nota Fiscal Eletrônica)
 * 
 * @param doc - Elemento raiz do documento NF-e
 * @param fileName - Nome do arquivo para log
 * @returns Objeto NotaFiscal preenchido
 */
function parseNFe(doc: Element, fileName: string): NotaFiscal {
  // Elementos principais
  const infNFe = findElementByLocalName(doc, 'infNFe');
  const ide = findElementByLocalName(doc, 'ide');
  const emit = findElementByLocalName(doc, 'emit');
  const dest = findElementByLocalName(doc, 'dest');
  const total = findElementByLocalName(doc, 'total');
  const icmsTot = total ? findElementByLocalName(total, 'ICMSTot') : null;
  const emitEnder = findElementByLocalName(emit, 'enderEmit');
  const destEnder = findElementByLocalName(dest, 'enderDest');
  
  // Extrai CFOP do primeiro item (necessário para detecção de tipo)
  const primeiroItem = getElementsByLocalName(doc, 'det')[0];
  const cfop = primeiroItem ? getTextContent(primeiroItem, 'CFOP') : '';
  
  // Identifica tipo de operação (usa CFOP, tpNF, e emitente/destinatário)
  const tipoOperacao = detectNFeOperationType(ide, emit, dest, cfop, fileName);
  
  // Finalidade da NF-e (1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução)
  const finNFe = getTextContent(ide, 'finNFe');
  const natOp = getTextContent(ide, 'natOp');
  const idDest = getTextContent(ide, 'idDest');
  const destUF = getTextContent(destEnder, 'UF');
  
  // Identifica tipo especial PRIORITARIAMENTE pelo CFOP (usando cfop já extraído acima)
  const tipoPorCFOP = identificarTipoPorCFOP(cfop);
  const tipoPorNatureza = identificarTipoPorNatureza(natOp);
  
  // Define flags baseado no CFOP (prioridade) e finNFe (fallback)
  const isRemessa = tipoPorCFOP === 'remessa' || tipoPorNatureza === 'remessa';
  const isAjusteEstorno =
    tipoPorCFOP === 'devolucao' ||
    tipoPorNatureza === 'devolucao' ||
    tipoPorNatureza === 'ajuste' ||
    finNFe === '3' ||
    finNFe === '4';
  
  // Chave de acesso
  const chaveAcesso = infNFe?.getAttribute('Id')?.replace('NFe', '') ?? '';
  
  // Parceiro (fornecedor ou cliente conforme tipo de operação)
  const parceiro = tipoOperacao === 'Saída' ? dest : emit;
  const nome = getTextContent(parceiro, 'xNome');
  const cnpj = getTextContent(parceiro, 'CNPJ') || getTextContent(parceiro, 'CPF');

  // ── ICMS ─────────────────────────────────────────────────────────────────────
  // Valores do totalizador ICMSTot (padrão oficial SEFAZ)
  const baseICMS = getNumericContent(icmsTot, 'vBC');
  const valorICMS = getNumericContent(icmsTot, 'vICMS');

  // Alíquota ICMS: prefere pICMS declarado nos itens; fallback = cálculo reverso
  let declaredICMSPct = 0;
  for (const det of getElementsByLocalName(doc, 'det')) {
    const icmsEl = findElementByLocalName(det, 'ICMS');
    if (icmsEl?.children[0]) {
      const pICMS = getNumericContent(icmsEl.children[0], 'pICMS');
      if (pICMS > 0) { declaredICMSPct = pICMS; break; }
    }
  }
  const aliquotaICMS = declaredICMSPct > 0
    ? declaredICMSPct
    : (baseICMS > 0 && valorICMS > 0 ? Math.round((valorICMS / baseICMS) * 100 * 100) / 100 : 0);

  // ── VALOR TOTAL ───────────────────────────────────────────────────────────────
  // vNF é o valor total oficial da NF-e; vBC é apenas base de cálculo do ICMS
  const valorTotal =
    getNumericContent(icmsTot, 'vNF') ||
    getNumericContent(doc, 'vNF') ||
    getNumericContent(icmsTot, 'vProd') ||
    getNumericContent(doc, 'vProd') ||
    baseICMS;

  // ── REDUÇÃO DE BASE ICMS ──────────────────────────────────────────────────────
  // Varre todos os itens; registra o maior percentual de redução encontrado
  let reducaoICMS = 0;
  for (const det of getElementsByLocalName(doc, 'det')) {
    const icmsEl = findElementByLocalName(det, 'ICMS');
    if (icmsEl?.children[0]) {
      const pRed = getNumericContent(icmsEl.children[0], 'pRedBC');
      if (pRed > reducaoICMS) reducaoICMS = pRed;
    }
  }

  // ── TRIBUTOS ──────────────────────────────────────────────────────────────────
  // Sempre extrai valores declarados no totalizador (incluindo em remessas)
  // Zeramento de alíquotas e bases: populados abaixo
  let valorPIS = 0, valorCOFINS = 0, valorIPI = 0, valorDIFAL = 0;
  let aliquotaPIS = 0, aliquotaCOFINS = 0, aliquotaIPI = 0, aliquotaDIFAL = 0;
  let basePIS = 0, baseCOFINS = 0, baseIPI = 0;
  let declaredPISPct = 0, declaredCOFINSPct = 0, declaredIPIPct = 0;

  // IPI pode existir em remessas (circulação de mercadoria); sempre extrai
  const ipiSummary = aggregateIPI(doc);
  baseIPI = ipiSummary.base;
  declaredIPIPct = ipiSummary.declaredPctWeighted;
  valorIPI = getNumericContent(icmsTot, 'vIPI') || ipiSummary.value || 0;
  aliquotaIPI = declaredIPIPct > 0
    ? Math.round(declaredIPIPct * 100) / 100
    : (baseIPI > 0 && valorIPI > 0
      ? Math.round((valorIPI / baseIPI) * 100 * 100) / 100
      : 0);

  if (!isRemessa) {
    // PIS/COFINS: não incidem em remessas operacionais
    valorPIS    = getNumericContent(icmsTot, 'vPIS') || 0;
    valorCOFINS = getNumericContent(icmsTot, 'vCOFINS') || 0;

    // PIS — agrega por item para obter base e alíquota ponderada reais
    const pisSummary = aggregatePisCofins(doc, 'PIS');
    basePIS        = pisSummary.base;
    declaredPISPct = pisSummary.declaredPctWeighted;
    // Prioridade: % declarado → % calculado pela base própria → % calculado pela base ICMS
    aliquotaPIS = declaredPISPct > 0
      ? Math.round(declaredPISPct * 100) / 100
      : basePIS > 0 && valorPIS > 0
        ? Math.round((valorPIS / basePIS) * 100 * 100) / 100
        : baseICMS > 0 && valorPIS > 0
          ? Math.round((valorPIS / baseICMS) * 100 * 100) / 100
          : 0;

    // COFINS — análogo ao PIS
    const cofinsSummary = aggregatePisCofins(doc, 'COFINS');
    baseCOFINS        = cofinsSummary.base;
    declaredCOFINSPct = cofinsSummary.declaredPctWeighted;
    aliquotaCOFINS = declaredCOFINSPct > 0
      ? Math.round(declaredCOFINSPct * 100) / 100
      : baseCOFINS > 0 && valorCOFINS > 0
        ? Math.round((valorCOFINS / baseCOFINS) * 100 * 100) / 100
        : baseICMS > 0 && valorCOFINS > 0
          ? Math.round((valorCOFINS / baseICMS) * 100 * 100) / 100
          : 0;

    // DIFAL — usa vBCUFDest quando disponível, fallback para base ICMS
    valorDIFAL = getNumericContent(icmsTot, 'vICMSUFDest') || 0;
    const baseDIFAL = getNumericContent(icmsTot, 'vBCUFDest') || baseICMS;
    aliquotaDIFAL = baseDIFAL > 0 && valorDIFAL > 0
      ? Math.round((valorDIFAL / baseDIFAL) * 100 * 100) / 100
      : 0;

    const inferredDifal = inferDifalForInterstateEntry({
      tipoOperacao,
      idDest,
      destUF,
      baseICMS: baseDIFAL,
      valorICMS,
      aliquotaICMS,
      valorDIFAL,
      aliquotaDIFAL,
    });
    valorDIFAL = inferredDifal.valorDIFAL;
    aliquotaDIFAL = inferredDifal.aliquotaDIFAL;
  }

  // Data de emissão
  const dataStr = getTextContent(ide, 'dhEmi') || getTextContent(ide, 'dEmi');

  // Protocolo e situação
  const { situacao, situacaoInfo, dataMudancaSituacao } = extractProtocol(doc, 'protNFe');

  // Documentos referenciados
  const referenced = extractReferencedNFe(ide);

  // Materiais
  const material = extractMaterials(doc);

  // ── VALIDAÇÕES ────────────────────────────────────────────────────────────────
  // Cada tributo usa sua própria base declarada para calcular o esperado
  const tolerance = 5.0;
  let expectedPIS = 0, expectedCOFINS = 0, expectedIPI = 0, expectedICMS = 0;
  let verifiedPIS = true, verifiedCOFINS = true, verifiedIPI = true, verifiedICMS = true;

  // IPI: validado sempre (pode existir em remessas)
  if (valorIPI > 0 || aliquotaIPI > 0) {
    expectedIPI = (baseIPI || baseICMS) * (aliquotaIPI / 100);
    verifiedIPI = valorIPI === 0 || Math.abs(valorIPI - expectedIPI) <= tolerance;
  }

  if (!isRemessa) {
    // PIS: usa base própria; se não disponível usa base ICMS
    expectedPIS = (basePIS || baseICMS) * (aliquotaPIS / 100);
    verifiedPIS = valorPIS === 0 || Math.abs(valorPIS - expectedPIS) <= tolerance;

    // COFINS: análogo ao PIS
    expectedCOFINS = (baseCOFINS || baseICMS) * (aliquotaCOFINS / 100);
    verifiedCOFINS = valorCOFINS === 0 || Math.abs(valorCOFINS - expectedCOFINS) <= tolerance;

    // ICMS: usa base ICMS
    expectedICMS = baseICMS * (aliquotaICMS / 100);
    verifiedICMS = Math.abs(valorICMS - expectedICMS) <= tolerance;
  }

  // Retorna objeto NotaFiscal completo
  const tipoDoc = isRemessa ? 'NF-e (Remessa)'
                : ((tipoPorCFOP === 'devolucao' || tipoPorNatureza === 'devolucao' || finNFe === '4') ? 'NF-e (Devolução)'
                  : ((tipoPorNatureza === 'ajuste' || finNFe === '3') ? 'NF-e (Ajuste)'
                    : (finNFe === '2' ? 'NF-e (Complementar)'
                      : 'NF-e')));
  
  return {
    id: crypto.randomUUID(),
    tipo: tipoDoc,
    tipoOperacao,
    finNFe,
    cfop,
    isRemessa,
    isAjusteEstorno,
    numero: getTextContent(ide, 'nNF'),
    numeroCTe: '',
    serie: getTextContent(ide, 'serie'),
    dataEmissao: formatDate(dataStr),
    fornecedorCliente: nome,
    cnpjCpf: formatCnpjCpf(cnpj),
    valorTotal,
    baseCalculoICMS: baseICMS,
    aliquotaPIS: truncateToFourDecimals(aliquotaPIS),
    flagPIS: valorPIS > 0,
    valorPIS,
    aliquotaCOFINS: truncateToFourDecimals(aliquotaCOFINS),
    flagCOFINS: valorCOFINS > 0,
    valorCOFINS,
    aliquotaIPI: truncateToFourDecimals(aliquotaIPI),
    flagIPI: valorIPI > 0,
    valorIPI,
    aliquotaICMS: truncateToFourDecimals(aliquotaICMS),
    flagICMS: valorICMS > 0,
    valorICMS,
    aliquotaDIFAL: truncateToFourDecimals(aliquotaDIFAL),
    valorDIFAL,
    reducaoICMS,
    chaveAcesso,
    ...referenced,
    material,
    dataInsercao: '',
    verifiedPIS,
    verifiedCOFINS,
    verifiedIPI,
    verifiedICMS,
    expectedPIS,
    expectedCOFINS,
    expectedIPI,
    expectedICMS,
    basePIS,
    baseCOFINS,
    baseIPI,
    declaredPIS: declaredPISPct > 0 ? Math.round(declaredPISPct * 100) / 100 : undefined,
    declaredCOFINS: declaredCOFINSPct > 0 ? Math.round(declaredCOFINSPct * 100) / 100 : undefined,
    declaredIPI: declaredIPIPct > 0 ? Math.round(declaredIPIPct * 100) / 100 : undefined,
    situacao,
    situacaoInfo,
    dataMudancaSituacao,
  };
}

// ============================================================================
// MAIN PARSERS: CT-e
// ============================================================================

/**
 * Parser principal para CT-e (Conhecimento de Transporte Eletrônico)
 * 
 * @param doc - Elemento raiz do documento CT-e
 * @param fileName - Nome do arquivo para log
 * @returns Objeto NotaFiscal preenchido
 */
function parseCTe(doc: Element, fileName: string): NotaFiscal {
  // Elementos principais
  const infCte = findElementByLocalName(doc, 'infCte');
  const ide = findElementByLocalName(doc, 'ide');
  const emit = findElementByLocalName(doc, 'emit');
  const rem = findElementByLocalName(doc, 'rem');
  const dest = findElementByLocalName(doc, 'dest');
  const exped = findElementByLocalName(doc, 'exped');
  const receb = findElementByLocalName(doc, 'receb');
  const toma = findElementByLocalName(doc, 'toma4') || findElementByLocalName(doc, 'toma');
  const vPrest = findElementByLocalName(doc, 'vPrest');
  const imp = findElementByLocalName(doc, 'imp');
  const icms = imp ? findElementByLocalName(imp, 'ICMS') : null;
  
  // Identifica tipo de operação
  const tipoOperacao = detectCTeOperationType(ide, emit, rem, dest, exped, receb, toma, fileName);
  
  // Chave de acesso
  const chaveAcesso = infCte?.getAttribute('Id')?.replace('CTe', '') ?? '';
  
  // Parceiro (cliente ou fornecedor conforme tipo de operação)
  const parceiro = tipoOperacao === 'Saída' ? (toma || dest || rem) : emit;
  const nome = getTextContent(parceiro, 'xNome');
  const cnpj = getTextContent(parceiro, 'CNPJ') || getTextContent(parceiro, 'CPF');

  // ICMS
  const icmsChild = icms?.children[0];
  const baseICMS = getNumericContent(icmsChild, 'vBC');
  const valorICMS = getNumericContent(icmsChild, 'vICMS');
  const aliquotaICMS = getNumericContent(icmsChild, 'pICMS');
  const reducaoICMS = getNumericContent(icmsChild, 'pRedBC');

  // Valores totais
  const valorTotal = getNumericContent(vPrest, 'vTPrest') || getNumericContent(vPrest, 'vRec');
  const valorPIS = getNumericContent(imp, 'vPIS') || 0;
  const valorCOFINS = getNumericContent(imp, 'vCOFINS') || 0;
  const valorDIFAL = getNumericContent(icmsChild, 'vICMSUFDest') || 0;
  const valorIPI = getNumericContent(imp, 'vIPI') || 0;

  // Alíquotas
  // CT-e não tem IPI (tributo de mercadoria; CT-e é prestação de serviço de transporte)
  const aliquotaIPI = 0;

  // PIS/COFINS: tenta obter base própria do elemento imp; fallback para valor total do frete
  const pisNode    = findElementByLocalName(imp, 'PISST')    || findElementByLocalName(imp, 'PIS');
  const cofinsNode = findElementByLocalName(imp, 'COFINSST') || findElementByLocalName(imp, 'COFINS');
  const basePIS_cte    = getNumericContent(pisNode, 'vBC')    || valorTotal;
  const baseCOFINS_cte = getNumericContent(cofinsNode, 'vBC') || valorTotal;
  const declaredPIS_cte    = getNumericContent(pisNode, 'pPIS')    || getNumericContent(pisNode, 'pPISST');
  const declaredCOFINS_cte = getNumericContent(cofinsNode, 'pCOFINS') || getNumericContent(cofinsNode, 'pCOFINSST');

  const aliquotaPIS = declaredPIS_cte > 0
    ? declaredPIS_cte
    : (basePIS_cte > 0 && valorPIS > 0 ? Math.round((valorPIS / basePIS_cte) * 100 * 100) / 100 : 0);
  const aliquotaCOFINS = declaredCOFINS_cte > 0
    ? declaredCOFINS_cte
    : (baseCOFINS_cte > 0 && valorCOFINS > 0 ? Math.round((valorCOFINS / baseCOFINS_cte) * 100 * 100) / 100 : 0);

  // DIFAL: usa vBCUFDest quando disponível
  const baseDIFAL_cte = getNumericContent(icmsChild, 'vBCUFDest') || baseICMS;
  const aliquotaDIFAL = baseDIFAL_cte > 0 && valorDIFAL > 0
    ? Math.round((valorDIFAL / baseDIFAL_cte) * 100 * 100) / 100
    : 0;

  // Data de emissão
  const dataStr = getTextContent(ide, 'dhEmi') || getTextContent(ide, 'dEmi');

  // Protocolo e situação
  const { situacao, situacaoInfo, dataMudancaSituacao } = extractProtocol(doc, 'protCTe');

  // Documentos referenciados
  const referenced = extractReferencedCTe(doc);

  // Materiais
  const material = extractMaterials(doc);

  // Validações de consistência (cada tributo usa sua própria base)
  const expectedPIS    = (basePIS_cte    || valorTotal) * (aliquotaPIS    / 100);
  const verifiedPIS    = valorPIS    === 0 || amountsClose(valorPIS,    expectedPIS);
  const expectedCOFINS = (baseCOFINS_cte || valorTotal) * (aliquotaCOFINS / 100);
  const verifiedCOFINS = valorCOFINS === 0 || amountsClose(valorCOFINS, expectedCOFINS);
  const expectedIPI    = 0; // CT-e não tem IPI
  const verifiedIPI    = true;
  const expectedICMS   = baseICMS > 0 ? baseICMS * (aliquotaICMS / 100) : 0;
  const verifiedICMS   = amountsClose(valorICMS, expectedICMS);

  // Retorna objeto NotaFiscal completo
  return {
    id: crypto.randomUUID(),
    tipo: 'CT-e',
    tipoOperacao,
    numero: getTextContent(ide, 'nCT'),
    numeroCTe: getTextContent(ide, 'nCT'),
    serie: getTextContent(ide, 'serie'),
    dataEmissao: formatDate(dataStr),
    fornecedorCliente: nome,
    cnpjCpf: formatCnpjCpf(cnpj),
    valorTotal,
    baseCalculoICMS: baseICMS,
    aliquotaPIS: truncateToFourDecimals(aliquotaPIS),
    flagPIS: valorPIS > 0,
    valorPIS,
    aliquotaCOFINS: truncateToFourDecimals(aliquotaCOFINS),
    flagCOFINS: valorCOFINS > 0,
    valorCOFINS,
    aliquotaIPI: 0,
    flagIPI: false,
    valorIPI: 0,
    aliquotaICMS,
    flagICMS: valorICMS > 0,
    valorICMS,
    aliquotaDIFAL: truncateToFourDecimals(aliquotaDIFAL),
    valorDIFAL,
    reducaoICMS,
    chaveAcesso,
    nfeReferenciada: referenced.nfeReferenciada,
    cteReferenciado: '',
    chaveReferenciada: referenced.chaveReferenciada,
    material,
    dataInsercao: '',
    expectedPIS,
    expectedCOFINS,
    expectedIPI,
    expectedICMS,
    verifiedPIS,
    verifiedCOFINS,
    verifiedIPI,
    verifiedICMS,
    situacao,
    situacaoInfo,
    dataMudancaSituacao,
  };
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Parser principal de XMLs fiscais (NF-e e CT-e)
 * Ponto de entrada único para processamento de documentos fiscais eletrônicos
 * 
 * Suporta:
 * - NF-e (Nota Fiscal Eletrônica)
 * - CT-e (Conhecimento de Transporte Eletrônico)
 * - Documentos cancelados
 * - Diferentes layouts e namespaces
 * 
 * @param xmlContent - Conteúdo XML em string
 * @param fileName - Nome do arquivo (para logs e debug)
 * @returns Objeto NotaFiscal ou null se não processável
 */
export function parseNFeXML(xmlContent: string, fileName: string): NotaFiscal | null {
  try {
    // Limpeza e normalização do XML
    xmlContent = cleanXmlContent(xmlContent);

    // Parse do XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    // Verifica erros de parsing
    const parserError = xmlDoc.getElementsByTagName('parsererror')[0] 
      || findElementByLocalName(xmlDoc, 'parsererror');
      
    if (parserError) {
      console.error(`XML parsing error in ${fileName}:`, parserError.textContent);
      return null;
    }

    // Busca elementos principais
    const nfeProc = findElementByLocalName(xmlDoc, 'nfeProc');
    const cteProc = findElementByLocalName(xmlDoc, 'cteProc');
    const nfe = findElementByLocalName(xmlDoc, 'NFe') || (nfeProc && findElementByLocalName(nfeProc, 'NFe'));
    const cte = findElementByLocalName(xmlDoc, 'CTe') || (cteProc && findElementByLocalName(cteProc, 'CTe'));
    const infNFe = findElementByLocalName(xmlDoc, 'infNFe');
    const infCte = findElementByLocalName(xmlDoc, 'infCte');

    // Detecta e pula XMLs de eventos
    const isEventXML = findElementByLocalName(xmlDoc, 'procEventoNFe') 
      || findElementByLocalName(xmlDoc, 'procEventoCTe')
      || findElementByLocalName(xmlDoc, 'eventoCTe')
      || findElementByLocalName(xmlDoc, 'eventoNFe');

    if (isEventXML) {
      console.log(`Skipping event XML: ${fileName}`);
      return null;
    }

    // Detecta e processa XMLs de cancelamento
    const retCancNFe = findElementByLocalName(xmlDoc, 'retCancNFe');
    const retCancCTe = findElementByLocalName(xmlDoc, 'retCancCTe');

    if (retCancNFe || retCancCTe) {
      const cancelRoot = retCancNFe || retCancCTe;
      const infCanc = findElementByLocalName(cancelRoot, 'infCanc') || cancelRoot;
      const chNFe = getTextContent(infCanc, 'chNFe') || getTextContent(infCanc, 'chCTe') || '';
      const cStat = getTextContent(infCanc, 'cStat');
      const xMotivo = getTextContent(infCanc, 'xMotivo');
      const nProt = getTextContent(infCanc, 'nProt');

      return {
        id: crypto.randomUUID(),
        tipo: 'NF-e',
        tipoOperacao: 'Saída',
        numero: '',
        numeroCTe: '',
        serie: '',
        dataEmissao: '',
        fornecedorCliente: '',
        cnpjCpf: '',
        valorTotal: 0,
        baseCalculoICMS: 0,
        aliquotaPIS: 0,
        flagPIS: false,
        valorPIS: 0,
        aliquotaCOFINS: 0,
        flagCOFINS: false,
        valorCOFINS: 0,
        aliquotaIPI: 0,
        flagIPI: false,
        valorIPI: 0,
        aliquotaICMS: 0,
        flagICMS: false,
        valorICMS: 0,
        aliquotaDIFAL: 0,
        valorDIFAL: 0,
        reducaoICMS: 0,
        chaveAcesso: chNFe,
        nfeReferenciada: '',
        cteReferenciado: '',
        chaveReferenciada: '',
        material: '',
        situacao: 'Cancelada',
        situacaoInfo: { 
          cStat: cStat || undefined, 
          xMotivo: xMotivo || undefined, 
          nProt: nProt || undefined 
        },
        isCancellationFile: true,
      };
    }

    // Processa NF-e
    if (nfe || infNFe) {
      const target = nfe || (infNFe?.parentElement) || xmlDoc.documentElement;
      return parseNFe(target as Element, fileName);
    }
    
    // Processa CT-e
    if (cte || infCte) {
      const target = cte || (infCte?.parentElement) || xmlDoc.documentElement;
      return parseCTe(target as Element, fileName);
    }

    // Fallback: extração via regex para XMLs malformados
    try {
      const infNFeMatch = xmlContent.match(/<infNFe\b[^>]*>[\s\S]*?<\/infNFe>/i);
      if (infNFeMatch) {
        console.warn(`Fallback: extraído <infNFe> via regex em ${fileName}`);
        const tempDoc = parser.parseFromString(`<root>${infNFeMatch[0]}</root>`, 'text/xml');
        const target = findElementByLocalName(tempDoc, 'root') || tempDoc.documentElement;
        return parseNFe(target as Element, fileName);
      }

      const infCteMatch = xmlContent.match(/<infCte\b[^>]*>[\s\S]*?<\/infCte>/i);
      if (infCteMatch) {
        console.warn(`Fallback: extraído <infCte> via regex em ${fileName}`);
        const tempDoc = parser.parseFromString(`<root>${infCteMatch[0]}</root>`, 'text/xml');
        const target = findElementByLocalName(tempDoc, 'root') || tempDoc.documentElement;
        return parseCTe(target as Element, fileName);
      }
    } catch (e) {
      console.warn(`Erro no fallback regex para ${fileName}:`, e);
    }

    console.warn(`Unknown XML format in file: ${fileName}`);
    return null;
    
  } catch (error) {
    console.error(`Error parsing XML ${fileName}:`, error);
    return null;
  }
}
