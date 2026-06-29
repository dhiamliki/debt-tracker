import { apiClient } from './client'

export interface UserProfile {
  email: string
  displayName: string | null
  monthlyIncome: number | null
  verified: boolean
  twoFaEnabled: boolean
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

/**
 * PATCH /api/users/me/2fa — enable or disable two-factor authentication.
 * An `otpCode` (emailed via sendOtp) is required to confirm the change.
 */
export async function update2FA(
  enabled: boolean,
  otpCode?: string,
): Promise<UserProfile> {
  const res = await apiClient.patch('/users/me/2fa', { enabled, otpCode })
  return res.data.data as UserProfile
}

/** POST /api/auth/send-otp — email the authenticated user a 6-digit code. */
export async function sendOtp(): Promise<void> {
  await apiClient.post('/auth/send-otp')
}
