# Conversor XML → Excel | NF-e e CT-e ⚡️

🚀 **Aplicação web completa** para conversão automática de arquivos XML fiscais (NF-e e CT-e) para planilhas Excel.

**Stack:** Vite + React + TypeScript + Tailwind CSS

---

## ✨ Características Principais

- 🌐 **100% Web** - Roda no navegador, sem instalação necessária
- 🔒 **Privacidade Total** - Processamento local, seus dados nunca saem do computador
- ⚡ **Alta Performance** - Processamento instantâneo de múltiplos arquivos
- 📊 **Extração Completa** - Todos os tributos (PIS, COFINS, IPI, ICMS, DIFAL)
- 🎯 **Validação Automática** - Verifica consistência dos cálculos fiscais
- 📱 **Responsivo** - Funciona perfeitamente em desktop, tablet e mobile
- 🔄 **Detecção de Duplicatas** - Identifica notas já importadas
- 📥 **Drag & Drop** - Interface intuitiva para upload de arquivos
- 📤 **Exportação Excel** - Planilhas formatadas e prontas para uso

---

## 🌐 Deploy para Web

### ⚡ Opção 1: Vercel (Mais Rápido)
```bash
npm install -g vercel
vercel
```
**URL:** `https://seu-projeto.vercel.app` (grátis)

### 🎯 Opção 2: Netlify (Mais Fácil)
```bash
npm run build
# Arraste a pasta "dist" para netlify.com/drop
```
**URL:** `https://seu-projeto.netlify.app` (grátis)

### 📦 Opção 3: GitHub Pages (Gratuito)
- Push para GitHub
- Settings → Pages → GitHub Actions
**URL:** `https://seu-usuario.github.io/conversor-xml`

**📖 Guia completo de deploy:** Veja [DEPLOY.md](DEPLOY.md)

**🚀 Scripts rápidos:**
- Windows: `deploy.bat vercel` ou `deploy.bat netlify`
- Linux/Mac: `./deploy.sh vercel` ou `./deploy.sh netlify`

---

## 🧭 Tecnologias

- **Framework:** Vite + React 18
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS + Radix UI
- **Processamento:** DOMParser (nativo), XLSX.js
- **Animações:** Framer Motion
- **Formulários:** React Hook Form + Zod

---

## 🔧 Desenvolvimento Local

### Requisitos

- Node.js (versão LTS recomendada)
- npm (ou pnpm/yarn)

---

## 📦 Instalação

```bash
# clonar o repositório
git clone <URL-do-repositório>
cd "conversor XML"

# instalar dependências
npm install
```

---

## ▶️ Scripts úteis

- `npm run dev` — Inicia o servidor de desenvolvimento (Vite)
- `npm run build` — Gera a build de produção
- `npm run build:dev` — Build em modo development
- `npm run preview` — Pré-visualiza a build gerada
- `npm run lint` — Executa o ESLint

---

## ✅ Como usar

1. Execute `npm run dev`.
2. Abra o navegador em `http://localhost:5173`.
3. Faça upload do arquivo XML (arrastar ou clicar no seletor).
4. Revise os dados na tabela, remova duplicatas se necessário.
5. Clique em **Exportar** para gerar o arquivo `.xlsx`.

> Dica: a interface contém botões para localizar e resolver duplicatas antes da exportação.

---

## 🎨 Tema (visual)

- O projeto agora aplica um **tema escuro por padrão** com tons de roxo e preto para melhor foco e legibilidade em ambientes com pouca luz.
- As cores principais são parametrizadas em `src/index.css` (tokens CSS) e o tema é aplicado globalmente via `class="dark"` em `index.html`.
- Para desativar o tema escuro, remova `class="dark"` do `<html>` em `index.html` ou adicione um toggle de tema controlado por estado.

---

## 🗂 Estrutura do projeto (resumida)

- `src/components/` — componentes da UI (upload, tabela, botões)
- `src/lib/` — utilitários (parser XML, exportação para Excel)
- `src/pages/` — páginas (Index, NotFound)
- `public/` — arquivos estáticos

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Você pode:

1. Abrir uma issue descrevendo o problema ou a feature.
2. Criar um *fork* e enviar um pull request com as mudanças.

Por favor siga as regras de estilo de código do projeto e adicione testes/descrições quando relevante.

---

## 📝 Licença

Sem licença especificada neste repositório. Se desejar, adicione um arquivo `LICENSE` (por exemplo, MIT) para tornar a licença explícita.

---

## ✉️ Contato

Se precisar de ajuda, abra uma issue ou deixe uma mensagem no repositório.

---

**Bom trabalho!** Se quiser, eu posso também: adicionar um arquivo `LICENSE`, ajustar o texto para um README mais curto, ou incluir instruções para Docker/CI/CD. 🚀