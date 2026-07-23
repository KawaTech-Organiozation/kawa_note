# 🌱 Seed do Banco de Dados

Este documento descreve a estrutura de dados criada pelo seed do KawaMyCenter.

## 📋 Estrutura Criada

### 1. 👤 ADMIN (Usuário Global)
- **Email**: `admin@kawamycenter.com`
- **Senha**: `admin123456` (padrão) ou `$ADMIN_PASSWORD`
- **Tenant**: Nenhum (acesso global ao sistema)
- **Propósito**: Gerenciar o sistema, criar tenants, configurações globais

### 2. 🏢 TENANT (Empresa/Organização)
- **ID**: `demo-tenant-001`
- **Tipo**: JURIDICA
- **Razão Social**: KawaMyCenter Demo LTDA
- **Nome Fantasia**: KawaMyCenter Demo
- **CNPJ**: 12345678901234
- **Email**: contato@kawamycenter.com
- **Status**: Ativo e Onboarding Completo

### 3. 📦 PLANO DO TENANT
- **Nome**: FREE
- **Max Usuários**: 3
- **Max Clientes**: 50
- **Storage**: 5GB
- **Features**: Notes, Folders, Relations (sem Sharing e API)

### 4. 👤 USUÁRIO (Acesso ao App)
- **Email**: `user@kawamycenter.com`
- **Senha**: `user123456` (padrão) ou `$USER_PASSWORD`
- **Tenant**: `demo-tenant-001`
- **Propósito**: Usuário final que acessa o aplicativo

### 5. 📁 PASTAS DE EXEMPLO
- **Inbox** (azul, ícone inbox)
- **Trabalho** (roxo, ícone briefcase)
- **Pessoal** (verde, ícone user)

### 6. 📝 NOTAS DE EXEMPLO
- **Bem-vindo ao KawaMyCenter** (fixada, na Inbox)
- **Ideias de Projetos** (na pasta Trabalho)
- **Lista de Compras** (na pasta Pessoal)

### 7. 🔗 RELAÇÕES
- Relação entre nota de boas-vindas e ideias de projetos

## 🚀 Como Executar

### ⚠️ IMPORTANTE: Gerar o Prisma Client
Sempre que modificar o schema.prisma, execute:
```bash
cd backend
npx prisma generate
```

### Executar o Seed (sem apagar dados existentes)
```bash
cd backend
npm run seed
# ou
npm run db:seed
```

### 🔄 Resetar o Banco e Executar o Seed (RECOMENDADO)
```bash
cd backend
npm run db:reset
# Confirme com 'y' quando perguntado
# O seed será executado automaticamente após o reset
```

### Executar Migrations em Dev
```bash
cd backend
npx prisma migrate dev
# O seed será executado automaticamente se o banco estiver vazio
```

## 🔐 Variáveis de Ambiente

Você pode customizar as senhas através de variáveis de ambiente:

```bash
# .env
ADMIN_PASSWORD=sua_senha_admin_segura
USER_PASSWORD=sua_senha_user_segura
```

## ⚠️ Segurança

- ❌ O seed **NÃO PODE** ser executado em produção
- ❌ As senhas padrão **NÃO DEVEM** ser usadas em produção
- ✅ Sempre defina senhas fortes via variáveis de ambiente em produção

## 📊 Hierarquia de Acesso

```
┌─────────────────────────────────────┐
│  ADMIN (admin@kawamycenter.com)     │
│  - Acesso global ao sistema         │
│  - Sem tenant associado             │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  TENANT (demo-tenant-001)           │
│  - KawaMyCenter Demo LTDA           │
│  - Plano FREE                       │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  USER (user@kawamycenter.com)       │
│  - Acessa o app                     │
│  - Pertence ao tenant               │
│  - Tem pastas e notas               │
└─────────────────────────────────────┘
```

## 🎯 Casos de Uso

### Login como Admin
```javascript
POST /api/auth/login
{
  "email": "admin@kawamycenter.com",
  "password": "admin123456"
}
```

### Login como Usuário
```javascript
POST /api/auth/login
{
  "email": "user@kawamycenter.com",
  "password": "user123456"
}
```

## 📝 Notas

- O admin pode criar novos tenants
- O admin pode gerenciar planos
- Usuários só veem dados do seu tenant
- Todas as operações de dados são isoladas por tenant
