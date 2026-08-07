import { Router } from 'express';
import { asyncHandler } from '../../middlewares/error.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/role.js';
import { createUserSchema, updateUserSchema } from './users.schema.js';
import {
  createUser,
  getUser,
  listUsers,
  resetPassword,
  updateUser,
} from './users.service.js';

export const usersRoutes = Router();

usersRoutes.use(requireAuth);

usersRoutes.get(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (_req, res) => {
    const users = await listUsers();
    res.json({ data: users });
  }),
);

usersRoutes.post(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = createUserSchema.parse(req.body);
    const result = await createUser(data, req.user!.sub);
    res.status(201).json({ data: result });
  }),
);

usersRoutes.get(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const user = await getUser(req.params.id!);
    res.json({ data: user });
  }),
);

usersRoutes.patch(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = updateUserSchema.parse(req.body);
    const user = await updateUser(req.params.id!, data, req.user!.sub);
    res.json({ data: user });
  }),
);

usersRoutes.post(
  '/:id/reset-password',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const result = await resetPassword(req.params.id!, req.user!.sub);
    res.json({ data: result });
  }),
);
