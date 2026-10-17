import { z } from 'zod';
import { isValidPhoneNumber } from '../utils/phone';

// Auth Validators
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

export const requestOtpSchema = z.object({
  destination: z.string().min(3, 'Phone or email is required'),
  type: z.enum(['PHONE_VERIFY', 'PASSWORD_RESET']),
});

export const verifyOtpSchema = z.object({
  destination: z.string().min(3, 'Phone or email is required'),
  code: z.string().length(6, 'OTP must be 6 digits'),
  type: z.enum(['PHONE_VERIFY', 'PASSWORD_RESET']),
});

export const resetPasswordSchema = z
  .object({
    destination: z.string().min(3, 'Phone or email is required'),
    code: z.string().length(6, 'OTP must be 6 digits'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Service Request Validators
export const createServiceRequestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  serviceKeys: z.array(z.string()).min(1, 'Please select at least one service'),
  budgetRange: z.string().optional(),
  preferredContactTime: z.string().optional(),
});

export const updateRequestStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'APPROVED',
    'MEETING_SCHEDULED',
    'AWAITING_PAYMENT',
    'PROOF_SUBMITTED',
    'VERIFIED',
    'IN_PROGRESS',
    'COMPLETED',
    'REJECTED',
    'CLOSED',
  ]),
  reason: z.string().optional(),
});

export const assignStaffSchema = z.object({
  staffId: z.string().uuid('Invalid staff user ID').nullable(),
});

export const updatePrioritySchema = z.object({
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
});

// Messages and Sub-actions
export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
  type: z.enum(['GENERAL', 'APPROVAL', 'MEETING', 'PAYMENT', 'INTERNAL_NOTE']).default('GENERAL'),
  metadata: z.record(z.any()).optional(),
});

export const scheduleMeetingSchema = z.object({
  scheduledAt: z.string().datetime({ message: 'Must be a valid ISO datetime' }),
  durationMinutes: z.number().int().min(15).max(180).default(30),
  meetingType: z.enum(['ONLINE', 'IN_PERSON']).default('ONLINE'),
  locationOrUrl: z.string().min(3, 'Location or URL is required'),
  notes: z.string().optional(),
});

export const rescheduleMeetingSchema = z.object({
  reason: z.string().min(5, 'Reason for reschedule must be at least 5 characters'),
  preferredTime: z.string().optional(),
});

export const createPaymentRequestSchema = z.object({
  amount: z.number().positive('Amount must be greater than zero'),
  currency: z.enum(['ETB', 'USD']).default('ETB'),
  description: z.string().min(3, 'Description required'),
  paymentLink: z.string().url().optional().or(z.literal('')),
  bankDetails: z.record(z.any()).optional(),
  dueDate: z.string().datetime().optional(),
});

export const submitPaymentProofSchema = z.object({
  paymentRequestId: z.string().uuid(),
  referenceNumber: z.string().optional(),
  amountPaid: z.number().positive(),
  paymentMethod: z.enum(['TELEBIRR', 'CBE_BIRR', 'CBE_TRANSFER', 'BANK_TRANSFER', 'OTHER']),
  paymentDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  receiptAttachmentId: z.string().uuid().optional(),
});

export const verifyPaymentProofSchema = z.object({
  verified: z.boolean(),
  rejectionReason: z.string().optional(),
});

export const submitFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  isPublic: z.boolean().default(true),
});

export const replyTemplateSchema = z.object({
  title: z.string().min(2),
  category: z.string().min(2),
  content: z.string().min(5),
  placeholders: z.array(z.string()).optional(),
});

export const updateSettingSchema = z.object({
  value: z.record(z.any()),
  description: z.string().optional(),
});

export const adminCreateUserSchema = z.object({
  name: z.string().min(2),
  phone: z.string().refine(isValidPhoneNumber, { message: 'Invalid phone number' }),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['STAFF', 'ADMIN']),
});
