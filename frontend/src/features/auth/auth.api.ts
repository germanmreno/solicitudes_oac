import { api } from '@/lib/api/client';
import { useAuthStore, type User } from './auth.store';
import type { LoginInput } from '@/lib/schemas/auth';

export async function login(input: LoginInput) {
  const { data } = await api.post<{ data: { accessToken: string; user: User } }>(
    '/auth/login',
    input,
  );
  useAuthStore.getState().setSession(data.data.user, data.data.accessToken);
  return data.data;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    useAuthStore.getState().clear();
  }
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<{ data: User }>('/auth/me');
  useAuthStore.getState().setUser(data.data);
  return data.data;
}

export async function changeOwnPassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  await api.patch('/auth/me/password', payload);
}
