import { api } from '@/lib/api/client';

export interface UserListItem {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'OPERATOR';
  active: boolean;
  createdAt: string;
}

export interface CreateUserPayload {
  username: string;
  fullName: string;
  role: 'ADMIN' | 'OPERATOR';
  password?: string;
}

export async function listUsers(): Promise<UserListItem[]> {
  const { data } = await api.get<{ data: UserListItem[] }>('/users');
  return data.data;
}

export async function createUser(payload: CreateUserPayload) {
  const { data } = await api.post<{
    data: { user: UserListItem; tempPassword: string | null };
  }>('/users', payload);
  return data.data;
}

export async function updateUser(
  id: string,
  payload: Partial<{ fullName: string; role: 'ADMIN' | 'OPERATOR'; active: boolean; password: string }>,
) {
  const { data } = await api.patch<{ data: UserListItem }>(`/users/${id}`, payload);
  return data.data;
}

export async function resetPassword(id: string) {
  const { data } = await api.post<{ data: { tempPassword: string } }>(`/users/${id}/reset-password`);
  return data.data.tempPassword;
}
