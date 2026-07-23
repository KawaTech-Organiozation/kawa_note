/**
 * seed-plans.js — Catálogo de Planos (DB-INIT OBRIGATÓRIO)
 *
 * Este seed popula a tabela subscription_plans com os planos do produto.
 * É seguro para rodar em PRODUÇÃO — usa upsert idempotente, não cria
 * dados sensíveis e não sobrescreve customizações de campos não listados.
 *
 * Deve ser executado sempre que o banco for inicializado (Portainer / CI).
 *
 * Uso:
 *   node prisma/seed-plans.js
 *   npm run db:seed-plans
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLANS = [
  {
    planName: 'FREE',
    maxCompanies: 1,
    maxUsers: 3,
    maxCustomers: 50,
    maxStorageGb: 5,
    priceMonthly: 0.00,
    features: {
      notes: true,
      folders: true,
      relations: true,
      sharing: false,
      api: false
    },
    active: true
  },
  {
    planName: 'STARTER',
    maxCompanies: 2,
    maxUsers: 10,
    maxCustomers: 200,
    maxStorageGb: 20,
    priceMonthly: 49.90,
    features: {
      notes: true,
      folders: true,
      relations: true,
      sharing: true,
      api: false
    },
    active: true
  },
  {
    planName: 'PRO',
    maxCompanies: 5,
    maxUsers: 25,
    maxCustomers: 1000,
    maxStorageGb: 100,
    priceMonthly: 149.90,
    features: {
      notes: true,
      folders: true,
      relations: true,
      sharing: true,
      api: true
    },
    active: true
  }
];

async function main() {
  console.log('🌱 seed-plans.js — Populando catálogo de planos...\n');

  for (const plan of PLANS) {
    const result = await prisma.subscriptionPlan.upsert({
      where: { planName: plan.planName },
      update: {
        maxCompanies: plan.maxCompanies,
        maxUsers: plan.maxUsers,
        maxCustomers: plan.maxCustomers,
        maxStorageGb: plan.maxStorageGb,
        priceMonthly: plan.priceMonthly,
        features: plan.features,
        active: plan.active
      },
      create: plan
    });

    console.log(`✅ Plano: ${result.planName}`);
    console.log(`   Usuários: ${result.maxUsers} | Clientes: ${result.maxCustomers} | Storage: ${result.maxStorageGb}GB | Preço: R$ ${result.priceMonthly}/mês`);
  }

  console.log('\n✅ Catálogo de planos atualizado com sucesso.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Erro ao popular planos:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
