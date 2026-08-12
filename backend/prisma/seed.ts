import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

function generateTempPassword(): string {
  const charset =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
  const bytes = crypto.randomBytes(16);
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
}

const AID_AREAS_MEDICAS = [
  { name: 'Cardiología' },
  { name: 'Pediatría' },
  { name: 'Ginecología y Obstetricia' },
  { name: 'Traumatología y Ortopedia' },
  { name: 'Medicina Interna' },
  { name: 'Cirugía General' },
  { name: 'Dermatología' },
  { name: 'Oftalmología' },
  { name: 'Otorrinolaringología' },
  { name: 'Neurología' },
  { name: 'Psiquiatría' },
  { name: 'Psicología' },
  { name: 'Odontología' },
  { name: 'Urología' },
  { name: 'Endocrinología' },
  { name: 'Gastroenterología' },
  { name: 'Neumología' },
  { name: 'Nefrología' },
  { name: 'Oncología' },
  { name: 'Hematología' },
  { name: 'Reumatología' },
  { name: 'Infectología' },
  { name: 'Anestesiología' },
  { name: 'Radiología' },
  { name: 'Medicina General' },
  { name: 'Fisiatría y Rehabilitación' },
  { name: 'Nutrición y Dietética' },
  { name: 'Otras (especificar)', requiresDetail: true },
];

const DOCUMENT_TYPES_SEED = [
  { code: 'ID_DOCUMENT',       name: 'Cédula del solicitante',          requiredByDefault: true },
  { code: 'INVOICE',           name: 'Factura / Comprobante fiscal',   requiredByDefault: true },
  { code: 'MEDICAL_REPORT',    name: 'Informe médico',                  requiredByDefault: false },
  { code: 'PROOF_OF_DELIVERY', name: 'Comprobante de entrega',         requiredByDefault: false },
  { code: 'SCHOLARSHIP_DOC',   name: 'Documento de beca',              requiredByDefault: false },
  { code: 'HOUSING_DOC',       name: 'Documento de vivienda',          requiredByDefault: false },
  { code: 'ECONOMIC_PROOF',    name: 'Comprobante económico',          requiredByDefault: false },
  { code: 'REQUEST_LETTER',    name: 'Carta de solicitud',             requiredByDefault: true },
];

const DOC_REQUIREMENTS = {
  'Médica':      ['ID_DOCUMENT', 'REQUEST_LETTER', 'MEDICAL_REPORT', 'INVOICE'],
  'Social':      ['ID_DOCUMENT', 'REQUEST_LETTER', 'PROOF_OF_DELIVERY'],
  'Económica':   ['ID_DOCUMENT', 'REQUEST_LETTER', 'ECONOMIC_PROOF', 'INVOICE'],
  'Educacional': ['ID_DOCUMENT', 'REQUEST_LETTER', 'SCHOLARSHIP_DOC'],
};

async function main() {
  const username = 'admin';
  const existingUser = await prisma.user.findUnique({ where: { username } });

  if (!existingUser) {
    const tempPassword = generateTempPassword();
    const passwordHash = await argon2.hash(tempPassword, {
      type: argon2.argon2id,
    });

    await prisma.user.create({
      data: {
        username,
        passwordHash,
        fullName: 'Administrador CVM',
        role: Role.ADMIN,
        active: true,
      },
    });

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║  USUARIO ADMIN CREADO                               ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log(`║  Usuario:     ${username.padEnd(38)}║`);
    console.log(`║  Contraseña:  ${tempPassword.padEnd(38)}║`);
    console.log('║                                                    ║');
    console.log('║  ⚠️  Guarda esta contraseña. No se mostrará de nuevo║');
    console.log('║      Cámbiala al primer inicio de sesión.           ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
  } else {
    console.log(`ℹ️  Usuario "${username}" ya existe.`);
  }

  const existingTypes = await prisma.originType.findMany();
  if (existingTypes.length === 0) {
    await prisma.originType.createMany({
      data: [
        { name: 'Interno', requiresSite: true },
        { name: 'Externo', requiresSite: false },
      ],
    });
    console.log('✔ Tipos de procedencia creados: Interno, Externo');
  } else {
    console.log('ℹ️  Tipos de procedencia ya existen.');
  }

  const existingAidTypes = await prisma.aidType.findMany();
  if (existingAidTypes.length === 0) {
    await prisma.aidType.createMany({
      data: [
        { name: 'Social' },
        { name: 'Económica' },
        { name: 'Médica' },
        { name: 'Educacional' },
      ],
    });
    console.log('✔ Tipos de ayuda creados: Social, Económica, Médica, Educacional');
  } else {
    console.log('ℹ️  Tipos de ayuda ya existen.');
  }

  const medica = await prisma.aidType.findUnique({ where: { name: 'Médica' } });
  if (medica) {
    const existingAreas = await prisma.aidArea.count({ where: { aidTypeId: medica.id } });
    if (existingAreas === 0) {
      await prisma.aidArea.createMany({
        data: AID_AREAS_MEDICAS.map((a) => ({
          aidTypeId: medica.id,
          name: a.name,
          requiresDetail: a.requiresDetail ?? false,
        })),
      });
      console.log(`✔ ${AID_AREAS_MEDICAS.length} áreas médicas creadas bajo tipo Médica`);
    } else {
      console.log('ℹ️  Áreas médicas ya existen.');
    }
  }

  const social = await prisma.aidType.findUnique({ where: { name: 'Social' } });
  if (social) {
    const existing = await prisma.aidArea.count({ where: { aidTypeId: social.id } });
    if (existing === 0) {
      await prisma.aidArea.createMany({
        data: [
          { aidTypeId: social.id, name: 'Canasta básica' },
          { aidTypeId: social.id, name: 'Apoyo comunitario' },
          { aidTypeId: social.id, name: 'Transporte' },
          { aidTypeId: social.id, name: 'Vivienda' },
          { aidTypeId: social.id, name: 'Otras (especificar)', requiresDetail: true },
        ],
      });
      console.log('✔ 5 áreas sociales creadas bajo tipo Social');
    }
  }

  const economica = await prisma.aidType.findUnique({ where: { name: 'Económica' } });
  if (economica) {
    const existing = await prisma.aidArea.count({ where: { aidTypeId: economica.id } });
    if (existing === 0) {
      await prisma.aidArea.createMany({
        data: [
          { aidTypeId: economica.id, name: 'Microemprendimiento' },
          { aidTypeId: economica.id, name: 'Capital semilla' },
          { aidTypeId: economica.id, name: 'Insumos laborales' },
          { aidTypeId: economica.id, name: 'Herramientas' },
          { aidTypeId: economica.id, name: 'Otras (especificar)', requiresDetail: true },
        ],
      });
      console.log('✔ 5 áreas económicas creadas bajo tipo Económica');
    }
  }

  const educacional = await prisma.aidType.findUnique({ where: { name: 'Educacional' } });
  if (educacional) {
    const existing = await prisma.aidArea.count({ where: { aidTypeId: educacional.id } });
    if (existing === 0) {
      await prisma.aidArea.createMany({
        data: [
          { aidTypeId: educacional.id, name: 'Matrícula escolar' },
          { aidTypeId: educacional.id, name: 'Útiles escolares' },
          { aidTypeId: educacional.id, name: 'Uniforme' },
          { aidTypeId: educacional.id, name: 'Transporte escolar' },
          { aidTypeId: educacional.id, name: 'Otras (especificar)', requiresDetail: true },
        ],
      });
      console.log('✔ 5 áreas educacionales creadas bajo tipo Educacional');
    }
  }

  const existingDocTypes = await prisma.documentType.count();
  if (existingDocTypes === 0) {
    await prisma.documentType.createMany({
      data: DOCUMENT_TYPES_SEED.map((d) => ({
        code: d.code,
        name: d.name,
        requiredByDefault: d.requiredByDefault,
      })),
    });
    console.log(`✔ ${DOCUMENT_TYPES_SEED.length} tipos de documento creados`);

    const allTypes = await prisma.aidType.findMany();
    const docTypeByCode = new Map(
      (await prisma.documentType.findMany()).map((d) => [d.code, d]),
    );

    const linkData: { aidTypeId: string; documentTypeId: string; required: boolean }[] = [];
    for (const aidType of allTypes) {
      const codes = DOC_REQUIREMENTS[aidType.name as keyof typeof DOC_REQUIREMENTS] ?? ['ID_DOCUMENT'];
      for (const code of codes) {
        const docType = docTypeByCode.get(code);
        if (docType) {
          linkData.push({ aidTypeId: aidType.id, documentTypeId: docType.id, required: true });
        }
      }
    }
    if (linkData.length > 0) {
      await prisma.aidTypeDocumentType.createMany({ data: linkData });
      console.log(`✔ ${linkData.length} relaciones tipo-de-ayuda → tipo-de-documento creadas`);
    }
  } else {
    console.log('ℹ️  Tipos de documento ya existen.');
  }
}

main()
  .catch((err) => {
    console.error('❌ Error en seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
