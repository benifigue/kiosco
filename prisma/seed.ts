import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 12);
  const colabPassword = await bcrypt.hash('colab123', 12);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrador',
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { username: 'colaborador' },
    update: {},
    create: {
      name: 'Colaborador Demo',
      username: 'colaborador',
      password: colabPassword,
      role: 'COLABORADOR',
    },
  });

  // Demo products: upsert uno por uno
  // (SQLite + Prisma no soporta createMany con skipDuplicates)
  await prisma.product.upsert({
    where: { id: 'prod-001' },
    update: {},
    create: {
      id: 'prod-001',
      name: 'Coca Cola 500ml',
      barcode: '7790895000428',
      internalCode: 'BEB001',
      category: 'Bebidas',
      purchasePrice: 350,
      salePrice: 500,
      stock: 48,
      minStock: 12,
      active: true,
    },
  });

  await prisma.product.upsert({
    where: { id: 'prod-002' },
    update: {},
    create: {
      id: 'prod-002',
      name: 'Agua Mineral 500ml',
      barcode: '7798062539039',
      internalCode: 'BEB002',
      category: 'Bebidas',
      purchasePrice: 180,
      salePrice: 300,
      stock: 60,
      minStock: 12,
      active: true,
    },
  });

  await prisma.product.upsert({
    where: { id: 'prod-003' },
    update: {},
    create: {
      id: 'prod-003',
      name: 'Alfajor Havanna',
      barcode: '7790290001234',
      internalCode: 'DUL001',
      category: 'Dulces',
      purchasePrice: 400,
      salePrice: 600,
      stock: 5,
      minStock: 10,
      active: true,
    },
  });

  await prisma.product.upsert({
    where: { id: 'prod-004' },
    update: {},
    create: {
      id: 'prod-004',
      name: 'Cigarrillos Marlboro',
      barcode: '7891234567890',
      internalCode: 'TAB001',
      category: 'Tabaco',
      purchasePrice: 800,
      salePrice: 1100,
      stock: 30,
      minStock: 10,
      active: true,
    },
  });

  await prisma.product.upsert({
    where: { id: 'prod-005' },
    update: {},
    create: {
      id: 'prod-005',
      name: "Papas Fritas Lay's",
      barcode: '7501019290009',
      internalCode: 'SNK001',
      category: 'Snacks',
      purchasePrice: 290,
      salePrice: 450,
      stock: 0,
      minStock: 8,
      active: true,
    },
  });

  await prisma.storeConfig.upsert({
    where: { id: 'default-config' },
    update: {},
    create: {
      id: 'default-config',
      name: 'Mi Kiosco',
      description: 'Gestión profesional para tu negocio',
      address: 'Calle Falsa 123',
      phone: '11 1234-5678',
      currency: 'ARS',
      setupCompleted: true,
    },
  });

  await prisma.systemLog.create({
    data: {
      userId: admin.id,
      action: 'Sistema inicializado - seed ejecutado',
    },
  });

  console.log('Seed completado.');
  console.log('Admin:        admin       / admin123');
  console.log('Colaborador:  colaborador / colab123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
