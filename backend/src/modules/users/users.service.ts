import argon2 from 'argon2';
import crypto from 'node:crypto';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middlewares/error.js';
import { writeAudit } from '../audit/audit.service.js';
import type { CreateUserInput, UpdateUserInput } from './users.schema.js';

function generateTempPassword(): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const bytes = crypto.randomBytes(12);
  let password = '';
  for (let i = 0; i < 12; i++) {
    const byte = bytes[i] ?? 0;
    password += charset[byte % charset.length];
  }
  return password;
}

export async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createUser(input: CreateUserInput, actorId: string) {
  const password = input.password || generateTempPassword();
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const user = await prisma.user.create({
    data: {
      username: input.username,
      passwordHash,
      fullName: input.fullName,
      role: input.role as Role,
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  await writeAudit({
    userId: actorId,
    action: 'CREATE_USER',
    entity: 'User',
    entityId: user.id,
    payload: { username: user.username, role: user.role },
  });

  return { user, tempPassword: input.password ? null : password };
}

export async function updateUser(id: string, input: UpdateUserInput, actorId: string) {
  const data: Record<string, unknown> = {};
  if (input.fullName !== undefined) data.fullName = input.fullName;
  if (input.role !== undefined) data.role = input.role;
  if (input.active !== undefined) data.active = input.active;
  if (input.password) {
    data.passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      active: true,
    },
  });

  await writeAudit({
    userId: actorId,
    action: 'UPDATE_USER',
    entity: 'User',
    entityId: id,
    payload: Object.keys(data),
  });

  return user;
}

export async function resetPassword(id: string, actorId: string) {
  const tempPassword = generateTempPassword();
  const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });
  await prisma.user.update({ where: { id }, data: { passwordHash } });

  await writeAudit({
    userId: actorId,
    action: 'RESET_PASSWORD',
    entity: 'User',
    entityId: id,
  });

  return { tempPassword };
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado');
  return user;
}
