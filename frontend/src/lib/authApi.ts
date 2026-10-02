const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface UserMe {
  user_id: string;
  email?: string;
  phone_number: string;
  role: string;
  profile_id?: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  community?: string;
  profile_status: string;
  is_premium: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  refresh_token?: string;
  profile_id?: string;
  first_name?: string;
  profile_status: string;
}

export interface RegisterPayload {
  profile_for?: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  phone_number: string;
  password: string;
  community?: string;
  sub_community?: string;
  native_place?: string;
  current_state?: string;
  current_city?: string;
  email?: string;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('borkonya_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('borkonya_token', token);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('borkonya_refresh_token');
}

export function setRefreshToken(token: string) {
  localStorage.setItem('borkonya_refresh_token', token);
}

export function removeRefreshToken() {
  localStorage.removeItem('borkonya_refresh_token');
}

export function removeAuthToken() {
  localStorage.removeItem('borkonya_token');
  removeRefreshToken();
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    removeAuthToken();
    throw new Error('Session expired. Please log in again.');
  }
  const data: TokenResponse = await res.json();
  setAuthToken(data.access_token);
  if (data.refresh_token) setRefreshToken(data.refresh_token);
  return data.access_token;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

// 1. Send OTP
export async function sendOtp(phoneNumber: string): Promise<{ message: string; demo_otp?: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to send OTP' }));
    throw new Error(err.detail || 'Failed to send OTP');
  }
  return res.json();
}

// 2. Verify OTP
export async function verifyOtp(phoneNumber: string, otpCode: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber, otp_code: otpCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Invalid OTP' }));
    throw new Error(err.detail || 'Invalid or expired OTP');
  }
  return res.json();
}

// 3. Register
export async function registerUser(payload: RegisterPayload): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
    // Pydantic validation error or HTTP exception
    let msg = err.detail;
    if (Array.isArray(err.detail)) {
      msg = err.detail.map((e: any) => e.msg || e.message).join(', ');
    }
    throw new Error(msg || 'Registration failed. Please check the form.');
  }
  const data: TokenResponse = await res.json();
  if (data.refresh_token) setRefreshToken(data.refresh_token);
  return data;
}

// 4. Login
export async function loginUser(phoneOrEmail: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone_or_email: phoneOrEmail,
      password: password,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }));
    let msg = err.detail;
    if (Array.isArray(err.detail)) {
      msg = err.detail.map((e: any) => e.msg).join(', ');
    }
    throw new Error(msg || 'Invalid email/mobile number or password.');
  }
  const data: TokenResponse = await res.json();
  if (data.refresh_token) setRefreshToken(data.refresh_token);
  return data;
}

// 5. Get Current User (/auth/me)
export async function getCurrentUser(): Promise<UserMe> {
  const token = getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error('Session expired or invalid');
  }
  return res.json();
}

// 6. Forgot Password
export async function forgotPassword(phoneOrEmail: string): Promise<{ status: string; message: string; demo_otp?: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_or_email: phoneOrEmail }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to process request' }));
    throw new Error(err.detail || 'Failed to process password reset request');
  }
  return res.json();
}

// 7. Reset Password
export async function resetPassword(phoneOrEmail: string, otpCode: string, newPassword: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone_or_email: phoneOrEmail,
      otp_code: otpCode,
      new_password: newPassword,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to reset password' }));
    let msg = err.detail;
    if (Array.isArray(err.detail)) {
      msg = err.detail.map((e: any) => e.msg).join(', ');
    }
    throw new Error(msg || 'Failed to reset password. Ensure password is at least 8 characters.');
  }
  return res.json();
}

// 8. Profile CRUD
export async function getMyProfile(): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/profile/me`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

export async function updateMyProfile(payload: Record<string, any>): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/profile/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update profile' }));
    throw new Error(err.detail || 'Failed to update profile');
  }
  return res.json();
}
