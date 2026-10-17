import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../api/client';
import { createServiceRequest } from '../../api/supabaseService';
import { Service, ServiceRequest } from '../../types';
import {
  PlusCircle,
  UploadCloud,
  FileText,
  X,
  Check,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const DEFAULT_SERVICES: Service[] = [
  { id: '1', key: 'telegram_bot', title: 'Telegram Bot', description: 'Custom automated bots with interactive menus and payment triggers.', startingPrice: 15000, currency: 'ETB', isActive: true },
  { id: '2', key: 'whatsapp_bot', title: 'WhatsApp Bot', description: 'Enterprise WhatsApp Business Cloud API integration and CRM handoff.', startingPrice: 18000, currency: 'ETB', isActive: true },
  { id: '3', key: 'marketing_website', title: 'Marketing Website', description: 'High-converting responsive landing pages built with modern frontend tools.', startingPrice: 25000, currency: 'ETB', isActive: true },
  { id: '4', key: 'mobile_app', title: 'Mobile App', description: 'Cross-platform iOS and Android apps with native device integration.', startingPrice: 60000, currency: 'ETB', isActive: true },
  { id: '5', key: 'it_support', title: 'IT Support Service', description: '24/7 server maintenance, network security audits, and helpdesk support.', startingPrice: 12000, currency: 'ETB', isActive: true },
  { id: '6', key: 'digital_marketing', title: 'Digital Marketing', description: 'Comprehensive multi-channel brand strategy and conversion campaigns.', startingPrice: 20000, currency: 'ETB', isActive: true },
  { id: '7', key: 'facebook_marketing', title: 'Facebook Marketing', description: 'Targeted Meta Ad campaigns, pixel tracking, and lead-gen funnels.', startingPrice: 15000, currency: 'ETB', isActive: true },
  { id: '8', key: 'youtube_marketing', title: 'YouTube Marketing', description: 'Video SEO, channel monetization optimization, and video ads.', startingPrice: 18000, currency: 'ETB', isActive: true },
  { id: '9', key: 'ecommerce_solutions', title: 'E-commerce Solutions', description: 'Custom online storefronts with Telebirr and CBE payment gateways.', startingPrice: 45000, currency: 'ETB', isActive: true },
];

const PRESET_BUDGETS = [
  'Under 20,000 ETB',
  '20,000 - 50,000 ETB',
  '50,000 - 100,000 ETB',
  '100,000+ ETB',
  'Flexible / Open to Quote',
];

const CONTACT_TIMES = [
  'Mornings (9:00 AM - 12:00 PM)',
  'Afternoons (2:00 PM - 5:00 PM)',
  'Evenings (5:00 PM - 8:00 PM)',
  'Anytime via Telegram / WhatsApp',
];

export const NewRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [availableServices, setAvailableServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [selectedServiceKeys, setSelectedServiceKeys] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [preferredContactTime, setPreferredContactTime] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read URL query parameter for preselected service
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const preService = params.get('service');
    if (preService) {
      setSelectedServiceKeys([preService]);
    }

    const fetchServices = async () => {
      try {
        const response = await api.get('/services');
        if (response.data?.data?.length) {
          setAvailableServices(response.data.data);
        }
      } catch (err) {
        // Fallback already pre-loaded
      }
    };
    fetchServices();
  }, [location.search]);

  const toggleService = (key: string) => {
    setSelectedServiceKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter((f) => {
        if (f.size > 10 * 1024 * 1024) {
          alert(`File ${f.name} exceeds maximum 10 MB size.`);
          return false;
        }
        return true;
      });
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedServiceKeys.length === 0) {
      setError('Please select at least one service category for your project.');
      return;
    }

    if (description.length < 10) {
      setError('Please provide a more descriptive overview (minimum 10 characters).');
      return;
    }

    setUploading(true);

    try {
      // 1. Create the Service Request directly via Supabase
      let newRequest: ServiceRequest;
      try {
        newRequest = await createServiceRequest({
          title,
          description,
          services: selectedServiceKeys,
          budgetRange: budgetRange || undefined,
          preferredContactTime: preferredContactTime || undefined,
        });
      } catch (sbErr) {
        console.warn('Supabase insertion failed, falling back to API:', sbErr);
        const requestRes = await api.post('/requests', {
          title,
          description,
          serviceKeys: selectedServiceKeys,
          budgetRange: budgetRange || undefined,
          preferredContactTime: preferredContactTime || undefined,
        });
        newRequest = requestRes.data.data;
      }

      // 2. Upload any attachments associated with this request (if server available)
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('serviceRequestId', newRequest.id);
          await api.post('/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (uploadErr) {
          console.warn('File upload note:', uploadErr);
        }
      }

      // 3. Navigate to request detail view
      navigate(`/portal/requests/${newRequest.id}`);
    } catch (err: any) {
      setError(err.message || err.response?.data?.error?.message || 'Failed to submit request. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Submit New Service Request
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Tell us about your requirements. Our Claude AI engine will classify your scope and alert our engineering team.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
          <div>
            <p className="font-bold">Submission Issue</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Select Services */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">
                1
              </span>
              Select Target Service(s) *
            </label>
            <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold">
              {selectedServiceKeys.length} selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {availableServices.map((svc) => {
              const isSelected = selectedServiceKeys.includes(svc.key);
              return (
                <div
                  key={svc.key}
                  onClick={() => toggleService(svc.key)}
                  className={`cursor-pointer p-4 rounded-2xl border text-left transition-all flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-brand-50/80 dark:bg-brand-950/60 border-brand-500 ring-2 ring-brand-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{svc.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {svc.description}
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-bold text-brand-600 dark:text-brand-400">
                      From {svc.startingPrice?.toLocaleString()} {svc.currency}
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'bg-brand-600 text-white' : 'border border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Request Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
          <label className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">
              2
            </span>
            Project Details
          </label>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Project Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. E-Commerce Store with Telebirr & Automated Delivery Tracking"
              className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Detailed Scope & Deliverables *
            </label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project goals, required integrations (e.g. Telebirr, CBE, SMS), target audience, and any reference websites or bots..."
              className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Estimated Budget Range
              </label>
              <select
                value={budgetRange}
                onChange={(e) => setBudgetRange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
              >
                <option value="">Select budget range (optional)</option>
                {PRESET_BUDGETS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Preferred Consultation Time
              </label>
              <select
                value={preferredContactTime}
                onChange={(e) => setPreferredContactTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
              >
                <option value="">Select preferred time</option>
                {CONTACT_TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 3: Attachments Upload */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <label className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">
              3
            </span>
            Attachments & Mockups (Optional)
          </label>

          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-brand-500 transition-colors">
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Drag and drop screenshots, PDFs, or requirement documents (max 10 MB each)
            </p>
            <label className="mt-3 inline-block px-4 py-2 rounded-xl text-xs font-bold text-brand-600 bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 cursor-pointer transition-colors">
              Browse Files
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500">Selected Files:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-brand-600 flex-shrink-0" />
                      <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                        {file.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={uploading}
            className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 active:scale-[0.99] transition-all shadow-xl hover:shadow-brand-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <span>Submitting & Running AI Analysis...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Submit Service Request</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
