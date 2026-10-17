import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Star,
  MessageSquare,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
  Search,
  Tag,
} from 'lucide-react';
import { api } from '../../api/client';

interface FeedbackItem {
  id: string;
  rating: number;
  comment?: string | null;
  isPublic: boolean;
  createdAt: string;
  client: {
    name: string;
  };
  serviceRequest: {
    requestNumber: string;
    title: string;
    services: Array<{
      service: {
        id: string;
        key: string;
        title: string;
      };
    }>;
  };
}

export const AdminFeedbackPage: React.FC = () => {
  const [ratingFilter, setRatingFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery<{
    feedbacks: FeedbackItem[];
    averageRating: number;
    count: number;
  }>({
    queryKey: ['admin-feedback', ratingFilter],
    queryFn: async () => {
      const url = ratingFilter ? `/feedbacks?rating=${ratingFilter}` : '/feedbacks';
      const res = await api.get(url);
      return {
        feedbacks: res.data.data || [],
        averageRating: res.data.meta?.averageRating || 5.0,
        count: res.data.meta?.count || 0,
      };
    },
  });

  const feedbacks = data?.feedbacks || [];
  const averageRating = data?.averageRating || 5.0;
  const totalCount = data?.count || 0;

  // Rating distribution counts
  const ratingCounts = [5, 4, 3, 2, 1].map((r) => {
    const count = feedbacks.filter((f) => f.rating === r).length;
    const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
    return { rating: r, count, percentage };
  });

  const filteredFeedbacks = feedbacks.filter((f) => {
    const term = searchTerm.toLowerCase();
    return (
      f.client.name.toLowerCase().includes(term) ||
      f.serviceRequest.requestNumber.toLowerCase().includes(term) ||
      f.serviceRequest.title.toLowerCase().includes(term) ||
      (f.comment && f.comment.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Star className="w-7 h-7 text-amber-500 fill-amber-500" />
          Client Feedback & CSAT Insights
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review client ratings, project testimonials, and customer satisfaction metrics across all 9 services.
        </p>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall CSAT Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Average Customer Rating
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-5xl font-extrabold text-slate-900 dark:text-white">
              {averageRating.toFixed(1)}
            </span>
            <span className="text-xl text-slate-400">/ 5.0</span>
          </div>

          <div className="flex items-center gap-1 mt-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(averageRating)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-300 dark:text-slate-700'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-400 mt-2">Based on {totalCount} verified reviews</span>
        </div>

        {/* Breakdown Card */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-center">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            Rating Distribution
          </h3>
          <div className="space-y-2.5">
            {ratingCounts.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-3 text-xs">
                <span className="w-8 font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  {rating} <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                </span>
                <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-12 text-right font-medium text-slate-500 dark:text-slate-400">
                  {count} ({percentage.toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search reviews, client names, requests..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars only</option>
            <option value="4">4 Stars only</option>
            <option value="3">3 Stars only</option>
            <option value="2">2 Stars or lower</option>
          </select>
        </div>
      </div>

      {/* Feedback Feed */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent mb-2"></div>
            <p>Loading feedback...</p>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <MessageSquare className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="font-medium">No client reviews found matching criteria.</p>
          </div>
        ) : (
          filteredFeedbacks.map((f) => (
            <div
              key={f.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300 font-bold flex items-center justify-center text-sm">
                    {f.client.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                      {f.client.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Request {f.serviceRequest.requestNumber}: {f.serviceRequest.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= f.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200 dark:text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {f.rating}.0
                  </span>
                </div>
              </div>

              {/* Review Text */}
              <div className="pt-3">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  "{f.comment || 'No written comment provided.'}"
                </p>
              </div>

              {/* Tags & Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-2 text-xs text-slate-400">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  {f.serviceRequest.services.map(({ service }) => (
                    <span
                      key={service.id}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[11px]"
                    >
                      {service.title}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3 h-3" />
                    {new Date(f.createdAt).toLocaleDateString()}
                  </span>
                  {f.isPublic && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Public on Website
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
