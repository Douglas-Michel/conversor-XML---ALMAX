# 🚀 Deploy do Conversor XML → Excel

Este projeto está **100% pronto para rodar na web**! Escolha uma das opções abaixo:

---

## ⚡ **Opção 1: Vercel (MAIS RÁPIDO)**

### Deploy Automático via GitHub:
1. Faça push do código para o GitHub
2. Acesse [vercel.com](https://vercel.com)
3. Conecte seu repositório GitHub
4. Clique em "Deploy"
5. ✅ Pronto! Site no ar em ~2 minutos

### Deploy via CLI:
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy (primeira vez - responda às perguntas)
vercel

# Deploys subsequentes
vercel --prod
```

**URL gerada:** `https://seu-projeto.vercel.app`

---

## 🎯 **Opção 2: Netlify (MAIS FÁCIL)**

### Método 1 - Arrasta e Solta:
```bash
# 1. Build local
npm run build

# 2. Acesse netlify.com/drop
# 3. Arraste a pasta "dist" para o site
# 4. ✅ Pronto!
```

### Método 2 - GitHub Auto-Deploy:
1. Push para GitHub
2. Acesse [netlify.com](https://netlify.com)
3. "New site from Git"
4. Selecione o repositório
5. Configuração automática detectada!

**URL gerada:** `https://seu-projeto.netlify.app`

---

## 📦 **Opção 3: GitHub Pages (GRATUITO)**

### Setup (Uma vez):
1. Push este código para GitHub
2. Vá em: **Settings → Pages**
3. Source: **GitHub Actions**
4. ✅ Deploy automático configurado!

**URL gerada:** `https://seu-usuario.github.io/conversor-xml`

### Deploy manual:
```bash
npm run build
# Upload pasta "dist" para GitHub Pages
```

---

## 🧪 **Testar Localmente**

### Desenvolvimento:
```bash
npm run dev
# Abre em http://localhost:8080
```

### Preview do Build de Produção:
```bash
npm run build
npm run preview
# Testa o build em http://localhost:4173
```

---

## ✨ **Características da Aplicação Web**

✅ **100% Client-Side** - Roda totalmente no navegador  
✅ **Zero Configuração de Servidor** - Não precisa backend  
✅ **Arquivos Processados Localmente** - Dados nunca saem do computador  
✅ **Funciona Offline** - Após carregamento inicial (PWA-ready)  
✅ **Responsivo** - Funciona em desktop, tablet e mobile  
✅ **Rápido** - Build otimizado com Vite  

---

## 🔧 **Configurações Criadas**

- ✅ `vercel.json` - Config para Vercel
- ✅ `netlify.toml` - Config para Netlify  
- ✅ `.github/workflows/deploy.yml` - CI/CD GitHub Pages
- ✅ `vite.config.ts` - Já configurado para produção

---

## 🌐 **Domínio Personalizado**

Após deploy, você pode adicionar domínio próprio:

### Vercel/Netlify:
1. Painel → Settings → Domains
2. Adicionar domínio personalizado
3. Configurar DNS (CNAME ou A record)

**Certificado SSL:** Automático e gratuito! 🔒

---

## 📊 **Performance Esperada**

- **Lighthouse Score:** 95-100
- **Tempo de Carregamento:** < 2 segundos
- **Tamanho do Bundle:** ~500KB gzipped
- **Processamento XML:** Instantâneo (browser-side)

---

## 🆘 **Problemas Comuns**

### Build falha:
```bash
# Limpar cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 404 em rotas:
- ✅ Já configurado! (`vercel.json` e `netlify.toml` têm rewrites)

### Não carrega após deploy:
- Verifique console do navegador (F12)
- Confirme que paths das imagens estão corretos

---

## 💡 **Dica Final**

**Melhor opção para você:**
- **Mais Rápido:** Vercel (1 comando)
- **Mais Simples:** Netlify Drag & Drop
- **Gratuito Total:** GitHub Pages

**Todas funcionam perfeitamente!** 🚀
