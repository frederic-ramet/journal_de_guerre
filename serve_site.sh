#!/bin/bash
# serve_site.sh - Lance un serveur web local pour consulter le journal

PORT=${1:-8080}

echo "🌐 Journal de Guerre - Serveur Web"
echo "=================================="
echo ""
echo "Démarrage du serveur sur le port $PORT..."
echo ""
echo "📖 Ouvrez votre navigateur à:"
echo "   http://localhost:$PORT/site/"
echo ""
echo "Pour arrêter: Ctrl+C"
echo ""

cd "$(dirname "$0")"
python3 -m http.server $PORT
