import { z } from 'zod';

export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  let cleaned = phone.trim().replace(/[\s\-\.\(\)]/g, '');
  if (/^0(9|7)\d{8}$/.test(cleaned)) return true;
  if (/^(9|7)\d{8}$/.test(cleaned)) return true;
  if (/^251(9|7)\d{8}$/.test(cleaned)) return true;
  if (/^\+251(9|7)\d{8}$/.test(cleaned)) return true;
  return /^\+[1-9]\d{6,14}$/.test(cleaned);
}

export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  let cleaned = rawPhone.trim().replace(/[\s\-\.\(\)]/g, '');
  if (/^0(9|7)\d{8}$/.test(cleaned)) return `+251${cleaned.substring(1)}`;
  if (/^(9|7)\d{8}$/.test(cleaned)) return `+251${cleaned}`;
  if (/^251(9|7)\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (cleaned.startsWith('+')) return cleaned;
  if (/^\d{7,15}$/.test(cleaned)) return `+${cleaned}`;
  return cleaned;
}

export const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().refine(isValidPhoneNumber, {
      message: 'Invalid phone number. Use Ethiopian (+2519... or +2517...) or valid international format',
    }),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    address: z.string().optional(),
    city: z.string().optional(),
    companyName: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Phone or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const createServiceRequestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  serviceKeys: z.array(z.string()).min(1, 'Please select at least one service'),
  budgetRange: z.string().optional(),
  preferredContactTime: z.string().optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
  type: z.enum(['GENERAL', 'APPROVAL', 'MEETING', 'PAYMENT', 'INTERNAL_NOTE']).default('GENERAL'),
  metadata: z.any().optional(),
});

export const submitPaymentProofSchema = z.object({
  paymentRequestId: z.string().uuid(),
  referenceNumber: z.string().optional(),
  amountPaid: z.number().positive(),
  paymentMethod: z.enum(['TELEBIRR', 'CBE_BIRR', 'CBE_TRANSFER', 'BANK_TRANSFER', 'OTHER']),
  paymentDate: z.string().optional(),
  notes: z.string().optional(),
  receiptAttachmentId: z.string().uuid().optional(),
});
