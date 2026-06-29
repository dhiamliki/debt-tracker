import { create } from 'zustand'

interface UserState {
  email: string | null
  displayName: string | null
  createdAt: string | null
  setProfile: (profile: {
    email: string
    displayName: string | null
    createdAt: string
  }) => void
}

/**
 * Holds the authenticated user's identity for display (navbar, profile).
 * Not persisted — it's fetched from GET /api/users/me on app load.
 */
export const useUserStore = create<UserState>((set) => ({
  email: null,
  displayName: null,
  createdAt: null,
  setProfile: (profile) =>
    set({
      email: profile.email,
      displayName: profile.displayName,
      createdAt: profile.createdAt,
    }),
}))
