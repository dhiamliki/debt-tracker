import { apiClient } from './client'

export interface UserProfile {
  email: string
  displayName: string | null
  monthlyIncome: number | null
  createdAt: string
}

/** GET /api/users/me — the authenticated user's profile. */
export async function getMe(): Promise<UserProfile> {
  const res = await apiClient.get('/users/me')
  return res.data.data as UserProfile
}

/** PATCH /api/users/me — update display name and/or monthly income. */
export async function updateMe(payload: {
  displayName?: string
  monthlyIncome?: number
}): Promise<UserProfile> {
  const res = await apiClient.patch('/users/me', payload)
  return res.data.data as UserProfile
}
