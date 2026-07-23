# Kawa Note

> **Suas notas. Suas conexões. Só suas.**

Kawa Note é uma plataforma de gestão de conhecimento com criptografia de ponta a ponta. Capture ideias com velocidade, organize em pastas, conecte notas entre si e nunca mais perca um pensamento importante — sem que ninguém, nem nós, consiga ler o que você escreveu.

---

## Por que o Kawa Note?

A maioria dos apps de notas armazena seu conteúdo em texto simples nos servidores da empresa. Com o Kawa Note, **seus dados são criptografados no dispositivo antes de sair dele**. Nem a nossa infraestrutura consegue ler suas notas.

Isso combinado com uma interface rápida, organização flexível e a capacidade de criar uma **rede de conhecimento** entre suas notas faz do Kawa Note uma ferramenta diferente de qualquer outra que você já usou.

---

## Funcionalidades principais

### Captura rápida, sem fricção
- **Quick Editor** com detecção automática de tipo: cole uma URL e o app já identifica como link, extraindo preview automático com título, descrição e imagem
- Campo de texto que expande conforme você digita — foco total no conteúdo, não na interface
- Suporte a quatro tipos de nota: **Texto, Link, Imagem e Palavra/Conceito**

### Organização que acompanha seu raciocínio
- **Pastas aninhadas** com cores e ícones personalizáveis
- **Sistema de Tags** com sugestões automáticas baseadas no conteúdo
- **Notas fixadas** para acesso imediato
- Filtros por tipo, pin e escopo (pasta ou global)

### Rede de conhecimento
- Crie **relações semânticas** entre notas (semântica, manual, referência, temporal)
- Visualize conexões e construa sua base de conhecimento pessoal
- Cada nota pode ter um campo de contexto para enriquecer o significado da conexão

### Workspace com abas
- Mantenha múltiplas notas abertas simultaneamente com o **Tab Bar**
- Navegue entre abas com `Ctrl+Tab` / `Ctrl+Shift+Tab`
- A barra de navegação e o header sempre visíveis — você nunca perde o contexto

### Criptografia de ponta a ponta
- Cada usuário tem uma chave de criptografia derivada de suas credenciais
- Nenhum dado é enviado para o servidor sem ser criptografado antes
- Migração automática de notas para novos esquemas de criptografia

---

## Para quem é

| Perfil | Benefício |
|---|---|
| **Profissional individual** | Captura rápida de ideias, links e referências com total privacidade |
| **Pesquisador / Estudante** | Construção de redes de conhecimento com conexões semânticas |
| **Empresa / Equipe** | Onboarding multi-tenant com gestão de usuários e planos |
| **Desenvolvedor** | Self-host com Docker, stack moderna, MIT license |

---

## Planos

| | Gratuito | Plus | Premium |
|---|:---:|:---:|:---:|
| Notas | 100 | Ilimitadas | Ilimitadas |
| Pastas | 10 | Ilimitadas | Ilimitadas |
| Armazenamento | 100 MB | 5 GB | 50 GB |
| Relações entre notas | — | Sim | Sim |
| Múltiplos usuários | — | — | Sim |
| Suporte prioritário | — | — | Sim |

---

## Stack tecnológica

**Frontend**
- React 18 + Vite
- Tailwind CSS + Radix UI / Shadcn UI
- Framer Motion (animações)
- React Query (estado de servidor)

**Backend**
- Fastify 4 (Node.js 20)
- PostgreSQL 16 + Prisma 5
- JWT + bcrypt
- Docker + Nginx

---

## Como rodar localmente

### Pré-requisitos
- Node.js 20+
- Docker e Docker Compose
- PostgreSQL (ou use o Docker Compose incluso)

### Instalação

O projeto é um monorepo com npm workspaces: `apps/web` (SPA React) e
`apps/api` (Fastify + Prisma).

```bash
# Clone o repositório
git clone https://github.com/KawaTech-Organiozation/kawa_note.git
cd kawa_note

# Instale tudo a partir da raiz (um único lockfile)
npm install

# Frontend (porta 3116) e backend (porta 3115), em terminais separados
npm run dev
npm run dev:api
```

Alternativa com Docker, subindo a stack inteira com build local:

```bash
docker compose -f docker-compose.local.yml up -d --build
```

O `docker-compose.yml` da raiz é o de **produção**: ele consome as imagens
publicadas no GHCR pelo workflow `Docker Publish` e não builda nada — é o
arquivo que o Portainer executa.

Acesse `http://localhost:3116` e faça o onboarding para criar sua conta.

> A porta da API está acoplada ao valor `3115`: o `nginx.conf` do frontend faz
> `proxy_pass` para `kawa-note-api:3115` e não lê variáveis de ambiente. Ao
> mudar `BACKEND_PORT`, atualize também o `nginx.conf`.

---

## Onboarding

O fluxo de cadastro guia você por 4 etapas:

1. **Identificação** — Pessoa física ou jurídica (CPF / CNPJ)
2. **Credenciais** — Email e senha (usados para derivar sua chave de criptografia)
3. **Plano** — Escolha o tier que atende sua necessidade
4. **Confirmação** — Revisão antes de finalizar

---

## Atalhos de teclado

| Atalho | Ação |
|---|---|
| `Ctrl+Tab` | Próxima aba |
| `Ctrl+Shift+Tab` | Aba anterior |
| `Ctrl+N` | Nova nota |
| `Ctrl+F` | Busca global |
| `Esc` | Fechar editor / modal |

---

## Contribuindo

Contribuições são bem-vindas. Por favor abra uma issue para discutir mudanças antes de enviar um PR.

1. Fork o repositório
2. Crie sua branch: `git checkout -b feature/minha-feature`
3. Commit suas mudanças: `git commit -m 'feat: adiciona minha feature'`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## Licença

MIT License — veja [LICENSE](LICENSE) para detalhes.

---

**Kawa Note** · Feito com foco em privacidade e clareza de pensamento.
