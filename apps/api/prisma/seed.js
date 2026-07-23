import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // CRITICAL: Prevent seed execution in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('❌ SEED SCRIPT CANNOT RUN IN PRODUCTION. This is a development-only script.');
  }

  console.log('🌱 Iniciando seed do banco de dados...\n');

  // ========================================
  // 1. CRIAR ADMIN (sem tenant - usuário global)
  // ========================================
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
  if (adminPassword === 'admin123456' && process.env.NODE_ENV === 'production') {
    throw new Error('❌ Default admin password detected in production. Set ADMIN_PASSWORD env var.');
  }

  const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@kawamycenter.com' },
    update: {},
    create: {
      email: 'admin@kawamycenter.com',
      password: hashedAdminPassword,
      name: 'Administrador do Sistema',
      tenantId: null // Admin não pertence a nenhum tenant
    }
  });
  
  console.log(`✅ Admin criado: ${adminUser.email}`);
  console.log(`   Nome: ${adminUser.name}`);
  console.log(`   Senha: ${adminPassword}\n`);

  // ========================================
  // 2. CRIAR TENANT (Empresa/Organização)
  // ========================================
  let demoTenant = await prisma.tenant.findUnique({
    where: { document: '12345678901234' }
  });

  if (!demoTenant) {
    demoTenant = await prisma.tenant.create({
      data: {
        tenantId: 'demo-tenant-001',
        tenantType: 'JURIDICA',
        fullName: 'Kawa Note Demo LTDA',
        tradeName: 'Kawa Note Demo',
        document: '12345678901234',
        fiscalNumber: '12.345.678/0001-90',
        street: 'Avenida Paulista',
        number: '1000',
        complement: 'Sala 100',
        district: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310100',
        country: 'Brasil',
        countryIso: 'BRA',
        phone: '1133334444',
        mobilePhone: '11999999999',
        email: 'contato@kawamycenter.com',
        website: 'https://kawamycenter.com',
        responsibleName: 'João Silva',
        responsiblePosition: 'Diretor',
        onboardingStatus: 'COMPLETED',
        onboardingStep: 'STEP_4',
        isActive: true
      }
    });
  }

  console.log(`✅ Tenant criado: ${demoTenant.tenantId}`);
  console.log(`   Razão Social: ${demoTenant.fullName}`);
  console.log(`   Nome Fantasia: ${demoTenant.tradeName}`);
  console.log(`   CNPJ: ${demoTenant.document}`);
  console.log(`   Email: ${demoTenant.email}\n`);

  // ========================================
  // 3. CRIAR PLANO DO TENANT
  // ========================================
  const freePlan = await prisma.tenantPlan.upsert({
    where: {
      tenantId_active: {
        tenantId: demoTenant.tenantId,
        active: true
      }
    },
    update: {},
    create: {
      tenantId: demoTenant.tenantId,
      planName: 'FREE',
      maxCompanies: 1,
      maxUsers: 3,
      maxCustomers: 50,
      maxStorageGb: 5,
      priceMonthly: 0,
      features: {
        notes: true,
        folders: true,
        relations: true,
        sharing: false,
        api: false
      }
    }
  });

  console.log(`✅ Plano criado: ${freePlan.planName}`);
  console.log(`   Max Usuários: ${freePlan.maxUsers}`);
  console.log(`   Max Clientes: ${freePlan.maxCustomers}`);
  console.log(`   Armazenamento: ${freePlan.maxStorageGb}GB\n`);

  // ========================================
  // 4. CRIAR USUÁRIO DO TENANT (para acessar o App)
  // ========================================
  const userPassword = process.env.USER_PASSWORD || 'dgo@2337';
  if (userPassword === 'dgo@2337' && process.env.NODE_ENV === 'production') {
    throw new Error('❌ Default user password detected in production. Set USER_PASSWORD env var.');
  }

  const hashedUserPassword = await bcrypt.hash(userPassword, 12);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'diegofurukawa@gmail.com' },
    update: {},
    create: {
      email: 'diegofurukawa@gmail.com',
      password: hashedUserPassword,
      name: 'Usuário Demo',
      tenantId: demoTenant.tenantId
    }
  });
  
  console.log(`✅ Usuário criado: ${demoUser.email}`);
  console.log(`   Nome: ${demoUser.name}`);
  console.log(`   Senha: ${userPassword}`);
  console.log(`   Tenant: ${demoTenant.tenantId}\n`);

  // ========================================
  // 5. CRIAR PASTAS DE EXEMPLO
  // ========================================
  const inboxFolder = await prisma.folder.upsert({
    where: { 
      id: '00000000-0000-0000-0000-000000000001' 
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Inbox',
      color: 'blue',
      icon: 'inbox',
      order: 0,
      userId: demoUser.id,
      tenantId: demoTenant.tenantId
    }
  });

  const workFolder = await prisma.folder.upsert({
    where: { 
      id: '00000000-0000-0000-0000-000000000002' 
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Trabalho',
      color: 'purple',
      icon: 'briefcase',
      order: 1,
      userId: demoUser.id,
      tenantId: demoTenant.tenantId
    }
  });

  const personalFolder = await prisma.folder.upsert({
    where: { 
      id: '00000000-0000-0000-0000-000000000003' 
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Pessoal',
      color: 'green',
      icon: 'user',
      order: 2,
      userId: demoUser.id,
      tenantId: demoTenant.tenantId
    }
  });

  console.log(`✅ Pastas criadas: ${inboxFolder.name}, ${workFolder.name}, ${personalFolder.name}\n`);

  // ========================================
  // 6. CRIAR NOTAS DE EXEMPLO
  // ========================================
  const note1 = await prisma.note.upsert({
    where: { 
      id: '00000000-0000-0000-0000-000000000011' 
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      title: 'Bem-vindo ao Kawa Note',
      content: 'Este é o seu centro de conhecimento pessoal. Comece criando notas, organizando-as em pastas e construindo conexões entre ideias.',
      type: 'text',
      tags: ['bem-vindo', 'início'],
      pinned: true,
      userId: demoUser.id,
      folderId: inboxFolder.id,
      tenantId: demoTenant.tenantId
    }
  });

  const note2 = await prisma.note.upsert({
    where: { 
      id: '00000000-0000-0000-0000-000000000012' 
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000012',
      title: 'Ideias de Projetos',
      content: '- App mobile para anotações\n- Sugestões de conteúdo com IA\n- Integração com armazenamento em nuvem',
      type: 'text',
      tags: ['ideias', 'projetos'],
      userId: demoUser.id,
      folderId: workFolder.id,
      tenantId: demoTenant.tenantId
    }
  });

  const note3 = await prisma.note.upsert({
    where: { 
      id: '00000000-0000-0000-0000-000000000013' 
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000013',
      title: 'Lista de Compras',
      content: '- Leite\n- Ovos\n- Pão\n- Café',
      type: 'text',
      tags: ['pessoal', 'compras'],
      userId: demoUser.id,
      folderId: personalFolder.id,
      tenantId: demoTenant.tenantId
    }
  });

  console.log(`✅ Notas criadas: ${note1.title}, ${note2.title}, ${note3.title}\n`);

  // ========================================
  // 7. CRIAR RELAÇÃO ENTRE NOTAS
  // ========================================
  await prisma.relation.upsert({
    where: {
      noteFromId_noteToId: {
        noteFromId: note1.id,
        noteToId: note2.id
      }
    },
    update: {},
    create: {
      noteFromId: note1.id,
      noteToId: note2.id,
      relationType: 'reference',
      strength: 0.8,
      context: 'Relacionado ao início com projetos',
      tenantId: demoTenant.tenantId
    }
  });

  console.log(`✅ Relação criada entre notas\n`);

  // ========================================
  // RESUMO FINAL
  // ========================================
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎉 SEED CONCLUÍDO COM SUCESSO!');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📋 CREDENCIAIS DE ACESSO:\n');
  
  console.log('👤 ADMIN (Acesso Global):');
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   Senha: ${adminPassword}`);
  console.log(`   Tenant: Nenhum (acesso global)\n`);
  
  console.log('👤 USUÁRIO (Acesso ao App):');
  console.log(`   Email: ${demoUser.email}`);
  console.log(`   Senha: ${userPassword}`);
  console.log(`   Tenant: ${demoTenant.tenantId}\n`);
  
  console.log('🏢 TENANT:');
  console.log(`   ID: ${demoTenant.tenantId}`);
  console.log(`   Nome: ${demoTenant.tradeName}`);
  console.log(`   CNPJ: ${demoTenant.document}\n`);
  
  console.log('📦 PLANO:');
  console.log(`   Nome: ${freePlan.planName}`);
  console.log(`   Usuários: ${freePlan.maxUsers}`);
  console.log(`   Clientes: ${freePlan.maxCustomers}`);
  console.log(`   Storage: ${freePlan.maxStorageGb}GB\n`);
  
  console.log('═══════════════════════════════════════════════════════');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
