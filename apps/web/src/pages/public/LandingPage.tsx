import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Bot,
  MessageCircle,
  Globe,
  Smartphone,
  ShieldCheck,
  TrendingUp,
  Share2,
  Video,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  CreditCard,
  Clock,
  Shield,
  Star,
} from 'lucide-react';

const SERVICES = [
  {
    key: 'TELEGRAM_BOT',
    title: 'Telegram Bot Development',
    description: 'Automated order booking, customer support bots, channel membership management, and interactive mini-apps.',
    price: '15,000 ETB',
    icon: Bot,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    key: 'WHATSAPP_BOT',
    title: 'WhatsApp Business API Bot',
    description: 'Official Meta WhatsApp Cloud API bots featuring product catalog browsing, FAQ automation, and live agent handoff.',
    price: '20,000 ETB',
    icon: MessageCircle,
    color: 'from-emerald-500 to-green-600',
  },
  {
    key: 'MARKETING_WEBSITE',
    title: 'Modern Marketing Website',
    description: 'Blazing fast, SEO-optimized, multilingual corporate websites and landing pages engineered to convert visitors into clients.',
    price: '25,000 ETB',
    icon: Globe,
    color: 'from-indigo-500 to-blue-600',
  },
  {
    key: 'MOBILE_APP',
    title: 'Mobile App Development',
    description: 'Cross-platform iOS and Android apps with offline capability, push notifications, and beautiful native UI.',
    price: '50,000 ETB',
    icon: Smartphone,
    color: 'from-purple-500 to-indigo-600',
  },
  {
    key: 'IT_SUPPORT',
    title: 'Managed IT Support Services',
    description: '24/7 server monitoring, proactive cybersecurity hardening, enterprise network management, and helpdesk SLA support.',
    price: '10,000 ETB/mo',
    icon: ShieldCheck,
    color: 'from-teal-500 to-emerald-600',
  },
  {
    key: 'DIGITAL_MARKETING',
    title: 'Digital Marketing & Growth',
    description: 'Data-driven growth hacking, local SEO, content strategies, and multi-channel audience acquisition.',
    price: '12,000 ETB',
    icon: TrendingUp,
    color: 'from-rose-500 to-orange-500',
  },
  {
    key: 'FACEBOOK_MARKETING',
    title: 'Facebook Ads & Lead Generation',
    description: 'Targeted Facebook and Instagram advertising campaigns focused on verifiable customer acquisition and ROAS.',
    price: '10,000 ETB',
    icon: Share2,
    color: 'from-blue-600 to-indigo-700',
  },
  {
    key: 'YOUTUBE_MARKETING',
    title: 'YouTube Growth & SEO',
    description: 'End-to-end channel optimization, high-CTR thumbnail strategy, audience retention tuning, and monetization.',
    price: '9,000 ETB',
    icon: Video,
    color: 'from-red-500 to-rose-600',
  },
  {
    key: 'ECOMMERCE',
    title: 'E-Commerce Solutions',
    description: 'Full online storefronts integrated with Telebirr, CBE Birr, Chapa, and international credit card checkouts.',
    price: '35,000 ETB',
    icon: ShoppingBag,
    color: 'from-amber-500 to-orange-600',
  },
];

const WORKFLOW = [
  {
    step: '01',
    title: 'Submit Service Request',
    description: 'Select your services, specify project scope, and upload relevant mockups or documents.',
  },
  {
    step: '02',
    title: 'AI Classification & Review',
    description: 'Our system auto-analyzes requirements and schedules an engineering discovery consultation.',
  },
  {
    step: '03',
    title: 'Milestone & Invoice',
    description: 'Receive itemized proposal and pay securely via Telebirr, CBE Bank Transfer, or card.',
  },
  {
    step: '04',
    title: 'Sprint Execution & Delivery',
    description: 'Track real-time progress in your client portal, verify deliverables, and rate service quality.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Bethlehem Haile',
    company: 'Lucy Fashion & Apparel',
    text: 'Zacma Tech built our e-commerce store with Telebirr payment integration in under 3 weeks. Our sales tripled within the first month!',
    rating: 5,
  },
  {
    name: 'Dawit Tadesse',
    company: 'Ethio Express Delivery',
    text: 'The automated package tracking Telegram bot revolutionized our customer support. Over 80% of routine inquiries are now answered instantly.',
    rating: 5,
  },
  {
    name: 'Almaz Bekele',
    company: 'Rift Valley Organics',
    text: 'Outstanding technical excellence, clear communication on milestones, and prompt payment verification. Highly recommended partner in Addis.',
    rating: 5,
  },
];

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleRequestClick = (serviceKey?: string) => {
    if (isAuthenticated) {
      navigate(serviceKey ? `/portal/new-request?service=${serviceKey}` : '/portal/new-request');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-100/60 via-transparent to-transparent dark:from-brand-950/40" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/80 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-bold uppercase tracking-wider mb-8">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span>Addis Ababa’s Leading AI-Powered Digital Agency</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-950 dark:text-white max-w-4xl mx-auto leading-tight">
            Build, Automate & Scale Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 dark:from-brand-400 dark:to-indigo-300">
              Technology Vision
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            From smart Telegram & WhatsApp bots to custom mobile applications and e-commerce with Telebirr integration. Manage requests, meetings, and payments seamlessly in one unified platform.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => handleRequestClick()}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-xl hover:shadow-brand-500/25 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Request a Service</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#services"
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            >
              Explore 9 Services
            </a>
          </div>

          {/* Trust Highlights */}
          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">99.8%</span>
              <span className="text-xs text-slate-500 font-medium mt-1">SLA Uptime Guarantee</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">&lt; 2h</span>
              <span className="text-xs text-slate-500 font-medium mt-1">Average Response Time</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">100%</span>
              <span className="text-xs text-slate-500 font-medium mt-1">Telebirr & CBE Verified</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">4.9/5</span>
              <span className="text-xs text-slate-500 font-medium mt-1">Client Satisfaction</span>
            </div>
          </div>
        </div>
      </section>

      {/* Services Showcase */}
      <section id="services" className="py-20 bg-white dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-2">
              End-to-End Technology Offerings
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              All 9 Specialized Services Under One Roof
            </h3>
            <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              Choose one or combine multiple services into an integrated project package.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICES.map((s) => {
              const IconComponent = s.icon;
              return (
                <div
                  key={s.key}
                  className="group relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:shadow-xl hover:border-brand-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${s.color} text-white flex items-center justify-center shadow-md mb-5 group-hover:scale-110 transition-transform`}
                    >
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{s.title}</h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                      {s.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Starting from</span>
                      <p className="text-sm font-extrabold text-brand-600 dark:text-brand-400">{s.price}</p>
                    </div>
                    <button
                      onClick={() => handleRequestClick(s.key)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:bg-brand-600 group-hover:text-white group-hover:border-transparent transition-all flex items-center gap-1"
                    >
                      <span>Request</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4-Step Seamless Workflow */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-2">
              Transparent Operations
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              How Your Project Travels from Idea to Launch
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {WORKFLOW.map((w) => (
              <div
                key={w.step}
                className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm"
              >
                <span className="text-4xl font-black text-brand-600/20 dark:text-brand-400/20">
                  {w.step}
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mt-2 mb-2">{w.title}</h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {w.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ethiopian Payment & Settlement Section */}
      <section id="pricing" className="py-16 bg-gradient-to-b from-brand-50 to-white dark:from-slate-900 dark:to-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Convenient Local & International Payment Options
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xl mx-auto">
            Upload your Telebirr screenshot or Commercial Bank of Ethiopia (CBE) transaction code directly in your portal for instant admin verification.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-black text-sm flex items-center justify-center">
                TB
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Telebirr SuperApp</span>
                <span className="text-[10px] text-slate-500">Merchant Code & Phone</span>
              </div>
            </div>

            <div className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-black text-sm flex items-center justify-center">
                CBE
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">CBE Birr & Mobile</span>
                <span className="text-[10px] text-slate-500">1000345678912</span>
              </div>
            </div>

            <div className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center">
                AW
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Awash Bank</span>
                <span className="text-[10px] text-slate-500">Corporate Checking</span>
              </div>
            </div>

            <div className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                $
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">USD & Wire Transfer</span>
                <span className="text-[10px] text-slate-500">SWIFT / International</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-2">
              Client Feedback
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              Trusted by Ethiopian Innovators & Businesses
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1 text-amber-400 mb-4">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 italic mb-6 leading-relaxed">
                    "{t.text}"
                  </p>
                </div>
                <div>
                  <h5 className="font-bold text-sm text-slate-900 dark:text-white">{t.name}</h5>
                  <span className="text-xs text-slate-500">{t.company}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 bg-brand-600 text-white">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            Ready to Launch Your Next Software or Digital Initiative?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-brand-100 max-w-2xl mx-auto">
            Submit your project request in less than two minutes. Our team will review the scope and provide a technical proposal.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => handleRequestClick()}
              className="px-8 py-4 rounded-xl text-base font-bold text-brand-600 bg-white hover:bg-brand-50 shadow-2xl transition-all"
            >
              Start Your Request Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
