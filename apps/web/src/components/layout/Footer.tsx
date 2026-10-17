import React from 'react';
import { Heart, Globe, Shield, MessageSquare } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 transition-colors py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">
                Z
              </div>
              <span className="font-extrabold text-slate-900 dark:text-white">Zacma Technologies</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Leading technology solutions provider in Addis Ababa, Ethiopia. Specializing in bots, custom software, apps, and digital growth.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Globe className="w-3.5 h-3.5" />
              <span>Bole Medhanialem, Addis Ababa</span>
            </div>
          </div>

          {/* Core Services */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Core Services
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>Telegram & WhatsApp Bots</li>
              <li>Modern Marketing Websites</li>
              <li>Mobile Apps (iOS & Android)</li>
              <li>E-Commerce Solutions (Telebirr/CBE)</li>
            </ul>
          </div>

          {/* Growth & Support */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Growth & Ops
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>Managed IT Support SLA</li>
              <li>Digital Performance Marketing</li>
              <li>Facebook & Meta Ad Campaigns</li>
              <li>YouTube Channel Growth</li>
            </ul>
          </div>

          {/* Security & Payment */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Ethiopian Payments
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              We seamlessly support direct verification for local Ethiopian banking and mobile money:
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                Telebirr
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                CBE Birr
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                Commercial Bank of Ethiopia
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Awash Bank
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Zacma Technologies PLC. All rights reserved.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> in Addis Ababa
          </p>
        </div>
      </div>
    </footer>
  );
};
