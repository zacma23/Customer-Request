export type Role = 'CLIENT' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';

export type RequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'MEETING_SCHEDULED'
  | 'AWAITING_PAYMENT'
  | 'PROOF_SUBMITTED'
  | 'VERIFIED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CLOSED';

export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type MessageType = 'GENERAL' | 'APPROVAL' | 'MEETING' | 'PAYMENT' | 'INTERNAL_NOTE';

export type MeetingStatus = 'SCHEDULED' | 'ACCEPTED' | 'RESCHEDULE_REQUESTED' | 'COMPLETED' | 'CANCELLED';

export type PaymentStatus = 'AWAITING_PAYMENT' | 'PROOF_SUBMITTED' | 'VERIFIED' | 'REJECTED';

export type ChannelType = 'TELEGRAM' | 'WHATSAPP';

export interface UserProfile {
  id: string;
  companyName?: string | null;
  address?: string | null;
  city?: string | null;
  telegramUsername?: string | null;
  whatsappPhone?: string | null;
  preferredLanguage: string;
  notes?: string | null;
}

export interface ChannelLink {
  id: string;
  channelType: ChannelType;
  channelUserId?: string | null;
  channelUsername?: string | null;
  isVerified: boolean;
  linkedAt?: string | null;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: Role;
  isActive: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  profile?: UserProfile | null;
  channelLinks?: ChannelLink[];
}

export interface Service {
  id: string;
  key: string;
  title: string;
  description: string;
  icon?: string | null;
  startingPrice?: number | null;
  currency: string;
  isActive: boolean;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileKey: string;
  mimeType: string;
  fileSize: number;
  url?: string;
  createdAt: string;
  uploadedBy?: { id: string; name: string } | null;
}

export interface Meeting {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingType: 'ONLINE' | 'IN_PERSON';
  locationOrUrl: string;
  status: MeetingStatus;
  clientRescheduleReason?: string | null;
  createdAt: string;
}

export interface PaymentProof {
  id: string;
  referenceNumber?: string | null;
  amountPaid: number;
  paymentMethod: string;
  paymentDate: string;
  notes?: string | null;
  receiptAttachment?: Attachment | null;
  submittedAt: string;
}

export interface PaymentRequest {
  id: string;
  amount: number;
  currency: string;
  description: string;
  paymentLink?: string | null;
  bankDetails?: string | null;
  dueDate?: string | null;
  status: PaymentStatus;
  rejectionReason?: string | null;
  proofs?: PaymentProof[];
  verifiedBy?: { id: string; name: string } | null;
  createdAt: string;
}

export interface Feedback {
  id: string;
  rating: number;
  comment?: string | null;
  isPublic: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  serviceRequestId: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    role: Role;
  };
  type: MessageType;
  content: string;
  metadata?: string | null;
  isReadByClient: boolean;
  isReadByAdmin: boolean;
  attachments?: Attachment[];
  meeting?: Meeting | null;
  paymentRequest?: PaymentRequest | null;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  requestNumber: string;
  clientId: string;
  title: string;
  description: string;
  budgetRange?: string | null;
  preferredContactTime?: string | null;
  status: RequestStatus;
  priority: Priority;
  assignedStaffId?: string | null;
  aiCategory?: string | null;
  aiPriority?: Priority | null;
  aiSentiment?: string | null;
  aiLanguage?: string | null;
  aiSummary?: string | null;
  aiNextAction?: string | null;
  createdAt: string;
  updatedAt: string;
  services: { service: Service }[];
  client: User;
  assignedStaff?: User | null;
  attachments?: Attachment[];
  messages?: Message[];
  meetings?: Meeting[];
  paymentRequests?: PaymentRequest[];
  feedback?: Feedback | null;
  _count?: { messages: number; attachments: number };
}

export interface ReplyTemplate {
  id: string;
  title: string;
  category: string;
  content: string;
  placeholders?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  user?: { name: string; email?: string | null; role: Role } | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface DashboardStats {
  totalRequests: number;
  statusCounts: Record<RequestStatus, number>;
  revenue: { etb: number; usd: number };
  satisfaction: { score: number; reviewCount: number };
  averageResponseTimeHours: number;
  serviceDistribution: { key: string; title: string; count: number }[];
  recentRequests: any[];
}
