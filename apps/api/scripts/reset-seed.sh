#!/bin/bash

# Script para resetar o banco de dados e executar o seed
# Uso: ./scripts/reset-seed.sh

echo "🗑️  Limpando banco de dados..."
echo ""

cd "$(dirname "$0")/.."

# Deletar todos os dados (mantém a estrutura)
npx prisma migrate reset --force

echo ""
echo "✅ Banco resetado e seed executado com sucesso!"
echo ""
echo "📋 Credenciais padrão:"
echo "   Admin: admin@kawamycenter.com / admin123456"
echo "   User:  user@kawamycenter.com / user123456"
echo ""
