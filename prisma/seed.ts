import { PrismaClient, Role, RequestStatus, Priority, MessageType, PaymentStatus, MeetingType, MeetingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const passwordHash = await bcrypt.hash('Password123!', 10);
  const superAdminPasswordHash = await bcrypt.hash(
    process.env.SUPER_ADMIN_PASSWORD || 'AdminSecurePassword123!',
    10
  );

  // 1. Seed Super Admin
  const superAdminPhone = process.env.SUPER_ADMIN_PHONE || '+251911223344';
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@zacma.tech';
  const superAdmin = await prisma.user.upsert({
    where: { phone: superAdminPhone },
    update: {
      role: Role.SUPER_ADMIN,
      isActive: true,
      isPhoneVerified: true,
    },
    create: {
      name: process.env.SUPER_ADMIN_NAME || 'System Super Admin',
      phone: superAdminPhone,
      email: superAdminEmail,
      passwordHash: superAdminPasswordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
      isPhoneVerified: true,
    },
  });
  console.log(`✅ Super Admin ready: ${superAdmin.email} (${superAdmin.phone})`);

  // 2. Seed Staff
  const staff = await prisma.user.upsert({
    where: { phone: '+251922334455' },
    update: { role: Role.STAFF },
    create: {
      name: 'Abebe Kebede',
      phone: '+251922334455',
      email: 'staff@zacma.tech',
      passwordHash,
      role: Role.STAFF,
      isActive: true,
      isPhoneVerified: true,
    },
  });
  console.log(`✅ Staff ready: ${staff.name}`);

  // 3. Seed Demo Clients
  const clientsData = [
    {
      name: 'Bethlehem Haile',
      phone: '+251911001122',
      email: 'betty@example.com',
      company: 'Lucy Fashion & Apparel',
      address: 'Bole Medhanialem, Edna Mall Tower 4th Floor',
      city: 'Addis Ababa',
      lang: 'en',
    },
    {
      name: 'Dawit Tadesse',
      phone: '+251912345678',
      email: 'dawit@example.com',
      company: 'Ethio Express Delivery',
      address: 'Mexico Square, Coffee & Tea Building',
      city: 'Addis Ababa',
      lang: 'am',
    },
    {
      name: 'Almaz Bekele',
      phone: '+251913998877',
      email: 'almaz@example.com',
      company: 'Rift Valley Organic Goods',
      address: 'Piazza, Churchill Avenue',
      city: 'Addis Ababa',
      lang: 'om',
    },
  ];

  const seededClients = [];
  for (const c of clientsData) {
    const user = await prisma.user.upsert({
      where: { phone: c.phone },
      update: {},
      create: {
        name: c.name,
        phone: c.phone,
        email: c.email,
        passwordHash,
        role: Role.CLIENT,
        isActive: true,
        isPhoneVerified: true,
        profile: {
          create: {
            companyName: c.company,
            address: c.address,
            city: c.city,
            preferredLanguage: c.lang,
          },
        },
      },
      include: { profile: true },
    });
    seededClients.push(user);
  }
  console.log(`✅ Seeded ${seededClients.length} demo clients`);

  // 4. Seed Services
  const servicesList = [
    {
      key: 'TELEGRAM_BOT',
      title: 'Telegram Bot Development',
      description: 'Intelligent, automated customer service, orders, broadcast and payment bots for Telegram.',
      startingPrice: 15000,
      icon: 'bot',
    },
    {
      key: 'WHATSAPP_BOT',
      title: 'WhatsApp Business API Bot',
      description: 'Official WhatsApp Cloud API chatbots with catalog showcase, customer support, and instant replies.',
      startingPrice: 20000,
      icon: 'message-circle',
    },
    {
      key: 'MARKETING_WEBSITE',
      title: 'Modern Marketing Website',
      description: 'High-speed, SEO-optimized, responsive landing pages and corporate websites built to convert.',
      startingPrice: 25000,
      icon: 'globe',
    },
    {
      key: 'MOBILE_APP',
      title: 'Mobile App Development',
      description: 'Native and cross-platform iOS and Android mobile applications with offline-first capabilities.',
      startingPrice: 50000,
      icon: 'smartphone',
    },
    {
      key: 'IT_SUPPORT',
      title: 'Managed IT Support Services',
      description: 'Proactive server maintenance, cybersecurity, network management, and 24/7 helpdesk SLA support.',
      startingPrice: 10000,
      icon: 'shield-check',
    },
    {
      key: 'DIGITAL_MARKETING',
      title: 'Digital Marketing & Growth',
      description: 'Comprehensive digital strategy, SEO, content marketing, and growth hacking campaigns.',
      startingPrice: 12000,
      icon: 'trending-up',
    },
    {
      key: 'FACEBOOK_MARKETING',
      title: 'Facebook Ads & Lead Generation',
      description: 'Targeted Facebook and Instagram advertising campaigns focused on verifiable customer acquisition.',
      startingPrice: 10000,
      icon: 'share-2',
    },
    {
      key: 'YOUTUBE_MARKETING',
      title: 'YouTube Channel Growth & SEO',
      description: 'Video optimization, audience monetization strategies, thumbnail design, and organic reach scaling.',
      startingPrice: 9000,
      icon: 'video',
    },
    {
      key: 'ECOMMERCE',
      title: 'E-Commerce Solutions & Integrations',
      description: 'End-to-end online store setup integrated with Telebirr, CBE Birr, and international payment cards.',
      startingPrice: 35000,
      icon: 'shopping-bag',
    },
  ];

  const serviceMap = new Map();
  for (const s of servicesList) {
    const svc = await prisma.service.upsert({
      where: { key: s.key },
      update: {
        title: s.title,
        description: s.description,
        startingPrice: s.startingPrice,
      },
      create: s,
    });
    serviceMap.set(s.key, svc);
  }
  console.log(`✅ Seeded ${servicesList.length} services`);

  // 5. Seed Reply Templates
  const templates = [
    {
      title: 'Request Acknowledgment',
      category: 'GREETING',
      content: 'Dear {{clientName}}, thank you for submitting request {{requestNumber}}. Our engineering team is currently reviewing your project specifications and will get back to you shortly.',
      placeholders: JSON.stringify(['{{clientName}}', '{{requestNumber}}']),
    },
    {
      title: 'Discovery Meeting Invitation',
      category: 'MEETING',
      content: 'Hello {{clientName}}, we would love to schedule a discovery meeting to discuss the scope and milestones for {{requestNumber}}. Please review the proposed meeting details below.',
      placeholders: JSON.stringify(['{{clientName}}', '{{requestNumber}}']),
    },
    {
      title: 'Quotation & Payment Request',
      category: 'PAYMENT',
      content: 'Hi {{clientName}}, our technical quote for {{requestNumber}} has been approved. You can complete the initial milestone payment using Telebirr, CBE Bank Transfer, or the online link.',
      placeholders: JSON.stringify(['{{clientName}}', '{{requestNumber}}']),
    },
    {
      title: 'Project Kickoff Announcement',
      category: 'APPROVAL',
      content: 'Great news {{clientName}}! Your payment proof for {{requestNumber}} has been verified. Our development sprint has begun and your assigned lead engineer is {{staffName}}.',
      placeholders: JSON.stringify(['{{clientName}}', '{{requestNumber}}', '{{staffName}}']),
    },
  ];

  for (const t of templates) {
    const existing = await prisma.replyTemplate.findFirst({ where: { title: t.title } });
    if (!existing) {
      await prisma.replyTemplate.create({ data: t });
    }
  }
  console.log('✅ Seeded canned reply templates');

  // 6. Seed System Settings
  const settingsData = [
    {
      key: 'BANK_ACCOUNTS',
      value: JSON.stringify([
        {
          bankName: 'Commercial Bank of Ethiopia (CBE)',
          accountName: 'Zacma Tech Solutions PLC',
          accountNumber: '1000345678912',
          branch: 'Bole Branch, Addis Ababa',
        },
        {
          bankName: 'Telebirr SuperApp Merchant',
          accountName: 'Zacma Technologies',
          accountNumber: '+251911223344',
          branch: 'Merchant Code: 894321',
        },
        {
          bankName: 'Awash International Bank',
          accountName: 'Zacma Tech Solutions PLC',
          accountNumber: '01320492812000',
          branch: 'Main Branch, Addis Ababa',
        },
      ]),
      description: 'Official banking and mobile money settlement accounts for client invoices.',
    },
    {
      key: 'SLA_HOURS',
      value: JSON.stringify({
        urgentResponseHours: 1,
        highResponseHours: 4,
        normalResponseHours: 12,
        lowResponseHours: 24,
      }),
      description: 'Target response SLA hours per priority tier.',
    },
    {
      key: 'AI_SETTINGS',
      value: JSON.stringify({
        autoReplyEnabled: false,
        classificationModel: 'claude-3-5-sonnet-20241022',
        languageDetection: true,
        maxTokensPerDraft: 500,
      }),
      description: 'Claude AI behavioral configurations and auto-reply safety switches.',
    },
    {
      key: 'COMPANY_BRANDING',
      value: JSON.stringify({
        companyName: 'Zacma Technologies',
        supportEmail: 'support@zacma.tech',
        supportPhone: '+251911223344',
        telegramBotUsername: 'ZacmaSupportBot',
        address: 'Bole Subcity, Woreda 03, Addis Ababa, Ethiopia',
      }),
      description: 'Global corporate branding and direct customer support contact details.',
    },
  ];

  for (const s of settingsData) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s,
    });
  }
  console.log('✅ Seeded system settings');

  // 7. Seed Sample Requests with complete lifecycle
  // Request 1: E-Commerce store (Client: Betty) -> IN_PROGRESS
  const req1 = await prisma.serviceRequest.upsert({
    where: { requestNumber: 'REQ-2026-0001' },
    update: {},
    create: {
      requestNumber: 'REQ-2026-0001',
      clientId: seededClients[0].id,
      title: 'Online Fashion Boutique with Telebirr & CBE Payment',
      description: 'We require a modern e-commerce storefront for our Lucy Fashion brand with product filtering, cart, order management, and automated Telebirr payment checkout with receipt verification.',
      budgetRange: '40,000 - 60,000 ETB',
      preferredContactTime: 'Afternoons (2:00 PM - 5:00 PM)',
      status: RequestStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      assignedStaffId: staff.id,
      aiCategory: 'ECOMMERCE',
      aiPriority: Priority.HIGH,
      aiSentiment: 'Positive and excited to launch before Ethiopian New Year',
      aiLanguage: 'English',
      aiSummary: 'Client wants an apparel e-commerce website with local payment gateway (Telebirr/CBE) integration and automated order processing.',
      aiNextAction: 'Sprint 2 development underway; prepare staging preview link',
      services: {
        create: [
          { serviceId: serviceMap.get('ECOMMERCE').id },
          { serviceId: serviceMap.get('MARKETING_WEBSITE').id },
        ],
      },
    },
  });

  // Message 1 for req1: Payment verified message
  const msg1 = await prisma.message.create({
    data: {
      serviceRequestId: req1.id,
      senderId: superAdmin.id,
      type: MessageType.PAYMENT,
      content: 'Initial milestone payment of 25,000 ETB has been received and verified. Development kickoff underway!',
      metadata: JSON.stringify({
        amount: 25000,
        currency: 'ETB',
        verified: true,
      }),
      isReadByClient: true,
      isReadByAdmin: true,
    },
  });

  // Payment request for req1
  const payReq1 = await prisma.paymentRequest.create({
    data: {
      serviceRequestId: req1.id,
      messageId: msg1.id,
      amount: 25000,
      currency: 'ETB',
      description: 'Milestone 1: 50% Deposit for UI/UX & Storefront Core',
      status: PaymentStatus.VERIFIED,
      verifiedByUserId: superAdmin.id,
      bankDetails: JSON.stringify({
        telebirr: '+251911223344',
        cbe: '1000345678912',
      }),
    },
  });

  await prisma.paymentProof.create({
    data: {
      paymentRequestId: payReq1.id,
      referenceNumber: 'TB-9988112233',
      amountPaid: 25000,
      paymentMethod: 'TELEBIRR',
      notes: 'Paid via Telebirr merchant payment code. Transaction screenshot attached.',
    },
  });

  // Request 2: Telegram Bot (Client: Dawit) -> AWAITING_PAYMENT
  const req2 = await prisma.serviceRequest.upsert({
    where: { requestNumber: 'REQ-2026-0002' },
    update: {},
    create: {
      requestNumber: 'REQ-2026-0002',
      clientId: seededClients[1].id,
      title: 'Automated Package Tracking Telegram Bot',
      description: 'We need a Telegram bot for Ethio Express Delivery where customers can enter their waybill number and immediately receive package status, courier contact, and estimated arrival.',
      budgetRange: '15,000 - 25,000 ETB',
      preferredContactTime: 'Mornings (9:00 AM - 12:00 PM)',
      status: RequestStatus.AWAITING_PAYMENT,
      priority: Priority.NORMAL,
      assignedStaffId: staff.id,
      aiCategory: 'TELEGRAM_BOT',
      aiPriority: Priority.NORMAL,
      aiSentiment: 'Neutral, straightforward business inquiry',
      aiLanguage: 'Amharic & English',
      aiSummary: 'Customer tracking Telegram bot with waybill lookup connected to logistics database.',
      aiNextAction: 'Client pending payment deposit of 15,000 ETB',
      services: {
        create: [{ serviceId: serviceMap.get('TELEGRAM_BOT').id }],
      },
    },
  });

  const payMsg2 = await prisma.message.create({
    data: {
      serviceRequestId: req2.id,
      senderId: staff.id,
      type: MessageType.PAYMENT,
      content: 'Your project proposal has been approved! Please find the payment details below to initiate bot development.',
      metadata: JSON.stringify({
        amount: 15000,
        currency: 'ETB',
        telebirr: '+251911223344',
        cbeAccount: '1000345678912',
      }),
      isReadByClient: false,
      isReadByAdmin: true,
    },
  });

  await prisma.paymentRequest.create({
    data: {
      serviceRequestId: req2.id,
      messageId: payMsg2.id,
      amount: 15000,
      currency: 'ETB',
      description: 'Setup and development fee for Telegram Tracking Bot',
      status: PaymentStatus.AWAITING_PAYMENT,
      bankDetails: JSON.stringify({
        telebirr: '+251911223344',
        cbeAccount: '1000345678912',
      }),
    },
  });

  // Request 3: Mobile App (Client: Almaz) -> PENDING
  await prisma.serviceRequest.upsert({
    where: { requestNumber: 'REQ-2026-0003' },
    update: {},
    create: {
      requestNumber: 'REQ-2026-0003',
      clientId: seededClients[2].id,
      title: 'Farmer Supply Chain Mobile Application',
      description: 'Cross-platform mobile application connecting organic fruit and coffee farmers directly with specialty grocers in Addis Ababa. Includes offline order booking, price index, and multilingual UI (English, Amharic, Afaan Oromo).',
      budgetRange: '80,000 - 120,000 ETB',
      preferredContactTime: 'Anytime',
      status: RequestStatus.PENDING,
      priority: Priority.URGENT,
      aiCategory: 'MOBILE_APP',
      aiPriority: Priority.URGENT,
      aiSentiment: 'High priority community initiative',
      aiLanguage: 'Afaan Oromo & English',
      aiSummary: 'Multilingual agricultural supply chain mobile app connecting farmers with Addis Ababa grocers.',
      aiNextAction: 'Review technical feasibility and schedule discovery call',
      services: {
        create: [
          { serviceId: serviceMap.get('MOBILE_APP').id },
          { serviceId: serviceMap.get('IT_SUPPORT').id },
        ],
      },
    },
  });

  console.log('✅ Seeded 3 comprehensive sample requests with payments & messages');
  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
