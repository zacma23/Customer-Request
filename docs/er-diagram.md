# Database Architecture & Entity-Relationship Diagram

This document models the relational schema of the platform, managed with **Prisma ORM** across PostgreSQL 16. It contains 19 models designed with composite indexes, foreign keys, cascade safety, and audit traceability.

---

## 1. Mermaid Entity-Relationship Diagram

```mermaid
erDiagram
    User ||--o| ClientProfile : "has profile"
    User ||--o{ RefreshToken : "owns"
    User ||--o{ OtpCode : "receives"
    User ||--o{ ChannelLink : "links"
    User ||--o{ ServiceRequest : "submits (as Client)"
    User ||--o{ ServiceRequest : "assigned to (as Staff)"
    User ||--o{ Message : "sends"
    User ||--o{ Feedback : "writes"
    User ||--o{ AuditLog : "triggers"
    User ||--o{ Notification : "receives"
    User ||--o{ Attachment : "uploads"

    ServiceRequest ||--|{ RequestService : "includes"
    Service ||--o{ RequestService : "referenced in"
    ServiceRequest ||--o{ Attachment : "contains"
    ServiceRequest ||--o{ Message : "threaded with"
    ServiceRequest ||--o{ Meeting : "schedules"
    ServiceRequest ||--o{ PaymentRequest : "invoiced with"
    ServiceRequest ||--o| Feedback : "reviewed by"
    ServiceRequest ||--o{ AiLog : "tracks AI calls"

    Message ||--o{ Attachment : "attaches"
    Message ||--o| Meeting : "embeds"
    Message ||--o| PaymentRequest : "embeds"

    PaymentRequest ||--o{ PaymentProof : "settled with"
    PaymentProof ||--o| Attachment : "includes receipt"

    User {
        string id PK
        string name
        string phone UK
        string email UK
        string passwordHash
        string role
        boolean isActive
        boolean isPhoneVerified
        int failedLoginAttempts
        datetime lockoutUntil
        datetime createdAt
        datetime updatedAt
    }

    ClientProfile {
        string id PK
        string userId FK
        string companyName
        string address
        string city
        string telegramUsername
        string whatsappPhone
        string preferredLanguage
    }

    Service {
        string id PK
        string key UK
        string title
        string description
        string icon
        float startingPrice
        string currency
        boolean isActive
    }

    ServiceRequest {
        string id PK
        string requestNumber UK
        string clientId FK
        string assignedStaffId FK
        string title
        string description
        string budgetRange
        string status
        string priority
        string aiCategory
        string aiPriority
        string aiSentiment
        string aiLanguage
        string aiSummary
        string aiNextAction
        datetime createdAt
    }

    PaymentRequest {
        string id PK
        string serviceRequestId FK
        float amount
        string currency
        string description
        string status
        string paymentLink
        string bankDetails
        datetime dueDate
    }

    PaymentProof {
        string id PK
        string paymentRequestId FK
        float amountPaid
        string paymentMethod
        string referenceNumber
        datetime paymentDate
        string receiptAttachmentId FK
    }

    Meeting {
        string id PK
        string serviceRequestId FK
        datetime scheduledAt
        int durationMinutes
        string meetingType
        string locationOrUrl
        string status
        string clientRescheduleReason
    }

    Feedback {
        string id PK
        string serviceRequestId FK
        string clientId FK
        int rating
        string comment
        boolean isPublic
        datetime createdAt
    }

    AuditLog {
        string id PK
        string userId FK
        string action
        string resourceType
        string resourceId
        json details
        string ipAddress
        string userAgent
        datetime createdAt
    }

    AiLog {
        string id PK
        string serviceRequestId FK
        string action
        int promptTokens
        int completionTokens
        int latencyMs
        boolean success
        string error
        datetime createdAt
    }
```

---

## 2. Table Directory & Model Summaries

| Model | Purpose | Primary Key | Key Indexes & Uniqueness |
| :--- | :--- | :--- | :--- |
| `User` | Clients, Staff, Admins, Super Admins | `id` (UUID) | `phone` (unique), `email` (unique) |
| `RefreshToken` | 7-day rotating refresh tokens | `id` (UUID) | `tokenHash` (unique), `userId` |
| `OtpCode` | 6-digit verification & password reset codes | `id` (UUID) | `[phone, purpose, isUsed]` |
| `ClientProfile` | Company name, location, preferred language | `id` (UUID) | `userId` (unique) |
| `ChannelLink` | Telegram chat ID & WhatsApp phone linking | `id` (UUID) | `[channelType, channelUserId]`, `syncCode` |
| `Service` | The 9 technology services catalogue | `id` (UUID) | `key` (unique) |
| `ServiceRequest` | Core customer request ticket | `id` (UUID) | `requestNumber` (unique), `[status, clientId]` |
| `RequestService` | Junction table for multi-service requests | `id` (UUID) | `[serviceRequestId, serviceId]` (unique) |
| `Attachment` | File upload metadata and storage keys | `id` (UUID) | `fileKey` (unique), `serviceRequestId` |
| `Message` | Request conversation threads & internal notes | `id` (UUID) | `serviceRequestId`, `[isReadByClient, isReadByAdmin]` |
| `Meeting` | Online / In-person discovery consultations | `id` (UUID) | `serviceRequestId`, `scheduledAt` |
| `PaymentRequest` | Invoices & milestone payment orders | `id` (UUID) | `serviceRequestId`, `status` |
| `PaymentProof` | CBE / Telebirr transaction slips & ref # | `id` (UUID) | `paymentRequestId`, `referenceNumber` |
| `Feedback` | Post-delivery 1-5 star ratings & testimonials | `id` (UUID) | `serviceRequestId` (unique), `rating` |
| `Notification` | In-app user notifications & read states | `id` (UUID) | `userId`, `isRead` |
| `ReplyTemplate` | Reusable admin canned responses | `id` (UUID) | `category` |
| `AuditLog` | Cryptographic event audit trail | `id` (UUID) | `userId`, `action`, `resourceType`, `createdAt` |
| `Setting` | System-wide banking & configuration values | `id` (UUID) | `key` (unique) |
| `AiLog` | Claude API usage, token counts & latencies | `id` (UUID) | `serviceRequestId`, `action`, `createdAt` |
