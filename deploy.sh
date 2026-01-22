#!/bin/bash

# Script de deploy automático
# Uso: ./deploy.sh [vercel|netlify|build]

set -e

echo "🚀 Conversor XML → Excel - Deploy Script"
echo ""

# Função de build
build() {
    echo "📦 Construindo aplicação..."
    npm run build
    echo "✅ Build concluído! Pasta 'dist' gerada."
}

# Função de deploy Vercel
deploy_vercel() {
    echo "🔵 Fazendo deploy na Vercel..."
    if ! command -v vercel &> /dev/null; then
        echo "⚠️  Vercel CLI não encontrado. Instalando..."
        npm install -g vercel
    fi
    vercel --prod
    echo "✅ Deploy na Vercel concluído!"
}

# Função de deploy Netlify
deploy_netlify() {
    echo "🟢 Fazendo deploy na Netlify..."
    if ! command -v netlify &> /dev/null; then
        echo "⚠️  Netlify CLI não encontrado. Instalando..."
        npm install -g netlify-cli
    fi
    build
    netlify deploy --prod --dir=dist
    echo "✅ Deploy na Netlify concluído!"
}

# Menu principal
case "$1" in
    vercel)
        deploy_vercel
        ;;
    netlify)
        deploy_netlify
        ;;
    build)
        build
        ;;
    *)
        echo "Escolha uma opção:"
        echo "  ./deploy.sh build      - Apenas build local"
        echo "  ./deploy.sh vercel     - Deploy na Vercel"
        echo "  ./deploy.sh netlify    - Deploy na Netlify"
        echo ""
        echo "Ou use os comandos diretos:"
        echo "  npm run build          - Build local"
        echo "  npm run preview        - Preview do build"
        exit 1
        ;;
esac
