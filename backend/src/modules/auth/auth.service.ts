import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middlewares/error.js';
import { writeAudit } from '../audit/audit.service.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../lib/jwt.js';
import { env } from '../../config/env.js';
import argon2 from 'argon2';
import crypto from 'node:crypto';
import type { ChangePasswordInput } from './auth.schema.js';

const REFRESH_COOKIE = 'cvm_refresh';

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: env.COOKIE_PATH,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function tokenVersion() {
  return Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
}

export async function loginUser(
  username: string,
  password: string,
  ip: string | undefined,
) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.active) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas');
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas');
  }

  const accessToken = signAccessToken({
    sub: user.id,
    username: user.username,
    role: user.role,
  });
  const refreshToken = signRefreshToken({
    sub: user.id,
    tokenVersion: tokenVersion(),
  });

  await writeAudit({
    userId: user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    payload: { ip },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
  };
}

export async function refreshSession(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'INVALID_REFRESH', 'Token de refresco inválido o expirado');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.active) {
    throw new AppError(401, 'USER_INACTIVE', 'Usuario inactivo o no encontrado');
  }

  const accessToken = signAccessToken({
    sub: user.id,
    username: user.username,
    role: user.role,
  });

  return {
    accessToken,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
  };
}

export async function logoutUser(userId: string | undefined) {
  if (userId) {
    await writeAudit({
      userId,
      action: 'LOGOUT',
      entity: 'User',
      entityId: userId,
    });
  }
  return { ok: true };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado');
  }
  return user;
}

export async function changeOwnPassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) {
    throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado');
  }

  const valid = await argon2.verify(user.passwordHash, input.currentPassword);
  if (!valid) {
    throw new AppError(400, 'INVALID_CURRENT_PASSWORD', 'La contraseña actual es incorrecta');
  }

  const passwordHash = await argon2.hash(input.newPassword, { type: argon2.argon2id });
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await writeAudit({
    userId,
    action: 'CHANGE_OWN_PASSWORD',
    entity: 'User',
    entityId: userId,
  });

  return { ok: true };
}

export { REFRESH_COOKIE };
export const _internal = { tokenVersion };
crypto.randomBytes(1);
