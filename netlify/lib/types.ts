import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: Role;
  isActive: boolean;
  isPhoneVerified: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: any;
}
