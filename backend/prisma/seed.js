import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';
import crypto from 'node:crypto';
const prisma = new PrismaClient();
function generateTempPassword() {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
    const bytes = crypto.randomBytes(16);
    let password = '';
    for (let i = 0; i < 16; i++) {
        password += charset[bytes[i] % charset.length];
    }
    return password;
}
async function main() {
    const username = 'admin';
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
        console.log(`ℹ️  Usuario "${username}" ya existe. Seed omitido.`);
        return;
    }
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
}
main()
    .catch((err) => {
    console.error('❌ Error en seed:', err);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
