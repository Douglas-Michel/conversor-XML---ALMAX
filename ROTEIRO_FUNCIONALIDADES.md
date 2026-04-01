# 📋 ROTEIRO DE FUNCIONALIDADES - CONVERSOR XML NF-e/CT-e

## 🎯 RESUMO DO PROJETO
Conversor web de arquivos XML fiscais (NF-e e CT-e) para Excel com identificação automática de tipos de notas, cálculo de tributos e validações.

---

## ✅ FUNCIONALIDADES IMPLEMENTADAS

### 1. **IDENTIFICAÇÃO DE TIPOS DE NOTA**

#### 1.1 Nota de Remessa
- **Critérios de identificação:**
  - `finNFe = 2` (finalidade complementar/remessa)
  - CFOPs de remessa: 5915, 6915, 5916, 6916, 5917, 6917, 5918, 6918, 5919, 6919, 5901-5908, 6901-6908, 5949, 6949, 5551, 6551, 5552, 6552, 5911, 6911, 5912, 6912
  - Palavra "remessa" na natureza da operação
- **Comportamento:** Tributos zerados (PIS, COFINS, IPI, DIFAL = 0)
- **Exibição:** "NF-e (Remessa)"

#### 1.2 Nota de Estorno
- **Critérios de identificação:**
  - `finNFe = 3` (ajuste)
- **Comportamento:** Tributos calculados normalmente
- **Exibição:** "NF-e (Estorno)"

#### 1.3 Nota de Devolução
- **Critérios de identificação:**
  - `finNFe = 4` (devolução)
  - CFOPs de devolução: 1201, 2201, 1202, 2202, 5201, 6201, 5202, 6202, 5209, 6209, 5210, 6210, 1209, 2209, 1210, 2210, 1918, 2918, 1919, 2919, 1916, 2916, 1917, 2917, 1902, 2902, 1903, 2903, 5410-5413, 6410-6413, 1410-1415, 2410-2415
- **Comportamento:** Tributos calculados normalmente
- **Exibição:** "NF-e (Devolução)"

#### 1.4 Nota Normal
- **Critérios:** Qualquer nota que não se encaixe nos tipos acima
- **Exibição:** "NF-e" ou "CT-e"

---

### 2. **DETECÇÃO DE ENTRADA/SAÍDA**

#### Ordem de Prioridade:
1. **Campo `tpNF` do XML** (0 = Entrada, 1 = Saída) → **PRIORIDADE MÁXIMA**
2. **CFOP** - primeiro dígito:
   - `1xxx` ou `2xxx` = **Entrada**
   - `5xxx` ou `6xxx` = **Saída**
3. **Emitente/Destinatário:**
   - Empresa emite = Saída
   - Empresa recebe = Entrada

#### CNPJ da Empresa:
- Configurar lista de CNPJs da empresa no código
- Exemplo: `'07868543000174'` (ALMAX)

---

### 3. **CÁLCULO DE TRIBUTOS**

#### 3.1 Regras de Cálculo
- **PIS:** Calculado sobre base ICMS
- **COFINS:** Calculado sobre base ICMS
- **IPI:** Usa alíquota declarada no XML
- **ICMS:** Valores do totalizador ICMSTot
- **DIFAL:** Diferencial de alíquota calculado

#### 3.2 Validações
- Compara valores declarados com cálculos
- Tolerância: 1% ou R$ 0,10
- Flags de verificação: `verifiedPIS`, `verifiedCOFINS`, `verifiedIPI`, `verifiedICMS`

---

### 4. **TOOLTIP COM INFORMAÇÕES DO CFOP**

#### Implementação na Interface Web:
- Ao passar o mouse sobre o badge "Tipo NF"
- Exibe popup com:
  - **CFOP:** código (ex: 5102)
  - **Descrição:** explicação do CFOP (ex: "Venda de mercadoria adquirida")

#### Descrições Principais dos CFOPs:
```
COMPRAS:
- 1102: Compra para comercialização
- 1101: Compra para industrialização
- 1201/1202: Devolução de venda

VENDAS:
- 5102: Venda de mercadoria adquirida
- 5101: Venda de produção própria
- 5201/5202: Devolução de compra

REMESSAS:
- 5915/6915: Remessa para demonstração
- 5917/6917: Remessa em consignação
- 5949/6949: Outra saída não especificada

DEVOLUÇÕES:
- 5410/6410: Devolução de compra para comercialização
- 1410/2410: Devolução de venda
```

---

### 5. **ESTRUTURA DE DADOS**

#### Campos Extraídos do XML:
```typescript
{
  id: string,
  tipo: string,              // "NF-e", "NF-e (Remessa)", "NF-e (Estorno)", etc.
  tipoOperacao: string,      // "Entrada" ou "Saída"
  finNFe: string,            // Finalidade da NF-e
  cfop: string,              // CFOP do primeiro item
  isRemessa: boolean,        // Flag de remessa
  isAjusteEstorno: boolean,  // Flag de ajuste/estorno
  numero: string,
  numeroCTe: string,
  serie: string,
  dataEmissao: string,
  fornecedorCliente: string,
  cnpjCpf: string,
  valorTotal: number,
  baseCalculoICMS: number,
  
  // Tributos
  aliquotaPIS: number,
  valorPIS: number,
  flagPIS: boolean,
  aliquotaCOFINS: number,
  valorCOFINS: number,
  flagCOFINS: boolean,
  aliquotaIPI: number,
  valorIPI: number,
  flagIPI: boolean,
  aliquotaICMS: number,
  valorICMS: number,
  flagICMS: boolean,
  aliquotaDIFAL: number,
  valorDIFAL: number,
  
  // Metadados
  reducaoICMS: number,
  chaveAcesso: string,
  material: string,
  situacao: string,          // "Ativa", "Cancelada", etc.
  dataInsercao: string,
}
```

---

### 6. **EXPORTAÇÃO EXCEL**

#### Colunas da Planilha:
1. DATA EMISSÃO
2. TIPO NF (formato: "NF-E - ENTRADA" ou "NF-E (REMESSA) - SAÍDA")
3. FORNECEDOR/CLIENTE
4. Nº NF-E
5. Nº CT-E
6. MATERIAL
7. VALOR
8. ALÍQ. PIS
9. PIS
10. ALÍQ. COF
11. COFINS
12. ALÍQ. IPI
13. IPI
14. ALÍQ. ICMS
15. ICMS
16. ALÍQ. DIFAL
17. DIFAL
18. ANO
19. REDUZ ICMS
20. MÊS
21. DATA INSERÇÃO
22. SITUAÇÃO
23. DATA MUDANÇA

#### Formatação:
- **Moeda:** R$ #,##0.00
- **Porcentagem:** #0.00%
- **Data:** dd/mm/yyyy

---

### 7. **INTERFACE DO USUÁRIO**

#### 7.1 Upload de Arquivos
- Drag & drop de múltiplos XMLs
- Detecção automática de duplicatas por chave de acesso
- Processamento local (privacidade total)

#### 7.2 Tabela de Dados
- Exibição em tempo real
- Badges coloridos:
  - **Remessa:** badge secundário (cinza)
  - **Estorno/Devolução:** badge outline (contorno)
  - **Normal:** badge padrão (azul)
  - **Entrada:** badge azul
  - **Saída:** badge vermelho

#### 7.3 Pesquisa
- Busca por número, fornecedor, material, etc.
- Filtro em tempo real

#### 7.4 Resumo
- Cards com totalizadores:
  - Total de notas
  - Valor total
  - Total PIS
  - Total COFINS

---

### 8. **VALIDAÇÕES E CONSISTÊNCIAS**

#### 8.1 Chave de Acesso
- Verifica 44 dígitos
- Extrai número da nota da chave

#### 8.2 Situação da Nota
- **100:** Autorizada (Ativa)
- **101:** Cancelada
- **3xx:** Negada
- Outros: Rejeitada

#### 8.3 Documentos Referenciados
- Identifica NF-e referenciada em estorno
- Identifica CT-e referenciado

---

### 9. **REGRAS DE NEGÓCIO ESPECÍFICAS**

#### 9.1 Para Remessa:
- ❌ **NÃO calcular** PIS, COFINS, IPI, DIFAL
- ✅ Zerar todos os tributos
- ✅ Manter valor total e ICMS

#### 9.2 Para Estorno/Devolução:
- ✅ **CALCULAR** todos os tributos normalmente
- ✅ Usar valores do XML
- ✅ Validar cálculos

#### 9.3 Notas Canceladas:
- Mantém os dados no sistema
- Marca situação como "Cancelada"
- Registra data de cancelamento

---

## 🔧 PONTOS DE CONFIGURAÇÃO

### 1. CNPJs da Empresa
```typescript
const EMPRESA_CNPJS = [
  '07868543000174', // CNPJ ALMAX (matriz)
  '07868543000155', // CNPJ ALMAX Filial
];
```

### 2. Alíquotas Padrão (Fallback)
```typescript
const DEFAULT_IPI_RATE = 3.25;
const DEFAULT_PIS_RATE = 1.65;
const DEFAULT_COFINS_RATE = 7.6;
```

### 3. Tolerância de Validação
```typescript
const AMOUNT_TOLERANCE_PERCENT = 0.01; // 1%
const AMOUNT_TOLERANCE_MIN = 0.10;     // R$ 0,10
```

---

## 📦 TECNOLOGIAS UTILIZADAS

- **Frontend:** React + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui
- **Parsing XML:** DOMParser (nativo do navegador)
- **Exportação:** XLSX (SheetJS)
- **Animações:** Framer Motion

---

## 🚀 DIFERENCIAIS DO SISTEMA

1. ✅ **100% Web** - Sem instalação
2. ✅ **Processamento Local** - Dados não saem do computador
3. ✅ **Identificação Inteligente** - Detecta remessa, estorno, devolução automaticamente
4. ✅ **Prioridade no CFOP** - Usa CFOP e tpNF antes de emitente/destinatário
5. ✅ **Tooltip Informativo** - Descrição do CFOP ao passar o mouse
6. ✅ **Validação Automática** - Verifica consistência dos cálculos
7. ✅ **Detecção de Duplicatas** - Evita importar a mesma nota duas vezes
8. ✅ **Suporte a CT-e** - Processa Conhecimento de Transporte Eletrônico
9. ✅ **Exportação Formatada** - Excel pronto para uso

---

## 📝 NOTAS IMPORTANTES

### Ordem de Prioridade para Detecção de Tipo:
1. **CFOP** (mais confiável)
2. **finNFe** (fallback)
3. **Natureza da Operação** (última opção)

### Para Entrada/Saída:
1. **tpNF** (campo oficial)
2. **CFOP** (primeiro dígito)
3. **Emitente/Destinatário** (fallback)

### Tributos em Remessa:
- ❌ Não calcular para evitar distorção nos relatórios fiscais
- ✅ Remessa é operação sem incidência de tributos

---

## 🎯 CASOS DE USO COMUNS

1. **Nota de venda normal:** NF-e - SAÍDA
2. **Nota de compra normal:** NF-e - ENTRADA
3. **Remessa para demonstração:** NF-e (Remessa) - SAÍDA (tributos zerados)
4. **Estorno de venda:** NF-e (Estorno) - ENTRADA (tributos calculados)
5. **Devolução de compra:** NF-e (Devolução) - SAÍDA (tributos calculados)

---

## 📞 SUPORTE

Para replicar essas funcionalidades em outro sistema:
1. Copie a lógica de detecção de tipos
2. Implemente a ordem de prioridade para entrada/saída
3. Configure os CNPJs da sua empresa
4. Adicione validações de cálculo
5. Implemente exportação formatada

---

**Data de Criação:** 26/01/2026
**Versão:** 2.0.0
**Empresa:** ALMAX Comercial e Distribuidora de Metais
