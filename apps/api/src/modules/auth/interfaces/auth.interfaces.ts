export interface MezonTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  id_token?: string
}

export interface MezonUserInfo {
  avatar: string | null
  display_name: string
  user_id: string
  email: string
  username: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
}

export interface AuthUserPayload {
  sub: string
  mezonUserId: string
  username: string
  role: string
  avatar?: string | null
  email?: string | null
  idToken?: string | null
}
