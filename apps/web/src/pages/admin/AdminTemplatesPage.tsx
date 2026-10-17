import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { ReplyTemplate } from '../../types';
import { Modal } from '../../components/common/Modal';
import { MessageSquare, Plus, Edit2, Trash2, Check } from 'lucide-react';

export const AdminTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReplyTemplate | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('GREETING');
  const [content, setContent] = useState('');

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/templates');
      setTemplates(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setTitle('');
    setCategory('GREETING');
    setContent('');
    setModalOpen(true);
  };

  const handleOpenEdit = (t: ReplyTemplate) => {
    setEditingTemplate(t);
    setTitle(t.title);
    setCategory(t.category);
    setContent(t.content);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await api.put(`/templates/${editingTemplate.id}`, { title, category, content });
      } else {
        await api.post('/templates', { title, category, content });
      }
      setModalOpen(false);
      fetchTemplates();
    } catch (err) {
      alert('Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.delete(`/templates/${id}`);
      fetchTemplates();
    } catch (err) {
      alert('Failed to delete template');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Canned Reply Templates
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage reusable customer response templates with dynamic variables like {'{{clientName}}'} and {'{{requestNumber}}'}
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs">Loading templates...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300">
                    {t.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">{t.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 font-mono">
                  {t.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTemplate ? 'Edit Reply Template' : 'Create Reply Template'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Template Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Discovery Meeting Confirmation"
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="GREETING">GREETING</option>
              <option value="APPROVAL">APPROVAL</option>
              <option value="MEETING">MEETING</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="FOLLOW_UP">FOLLOW_UP</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Content * (Use {'{{clientName}}'}, {'{{requestNumber}}'}, {'{{staffName}}'})
            </label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Hello {{clientName}}, thank you for submitting {{requestNumber}}..."
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-md"
          >
            Save Template
          </button>
        </form>
      </Modal>
    </div>
  );
};
