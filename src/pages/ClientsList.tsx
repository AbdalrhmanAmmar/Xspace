import React, { useState, useEffect } from 'react';
import { Users, Search, Phone, Briefcase, Clock, Grid, LayoutList, PlusCircle, X, Edit2 } from 'lucide-react';
import type { Client } from '../types/client';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const ClientsList = () => {
  const NEW_CLIENT_PERIOD = 30 * 24 * 60 * 60 * 1000;

  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    phone: '',
    job: ''
  });

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  const isClientNew = (createdAt: Date) => {
    const now = new Date().getTime();
    const clientCreationTime = createdAt.getTime();
    return now - clientCreationTime <= NEW_CLIENT_PERIOD;
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedClients = (data || []).map(client => ({
        id: client.id,
        name: client.name,
        phone: client.phone || undefined,
        job: client.job || undefined,
        age: client.age || undefined,
        lastVisit: new Date(client.last_visit),
        createdAt: new Date(client.created_at),
        isNewClient: client.is_new_client
      }));

      setClients(formattedClients);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('حدث خطأ أثناء تحميل بيانات العملاء');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('يجب تسجيل الدخول أولاً');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const now = new Date();

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update({
            name: formData.name,
            age: formData.age ? parseInt(formData.age) : null,
            phone: formData.phone || null,
            job: formData.job || null,
            updated_at: now.toISOString()
          })
          .eq('id', editingClient.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([{
            name: formData.name,
            age: formData.age ? parseInt(formData.age) : null,
            phone: formData.phone || null,
            job: formData.job || null,
            last_visit: now.toISOString(),
            is_new_client: true,
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          }]);

        if (error) throw error;
      }

      await fetchClients();
      setFormData({ name: '', age: '', phone: '', job: '' });
      setShowAddForm(false);
      setEditingClient(null);
    } catch (err: any) {
      console.error('Error saving client:', err);
      setError(err.message || 'حدث خطأ أثناء حفظ بيانات العميل');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      age: client.age?.toString() || '',
      phone: client.phone || '',
      job: client.job || '',
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchClients();
    } catch (err: any) {
      console.error('Error deleting client:', err);
      setError(err.message || 'حدث خطأ أثناء حذف العميل');
    } finally {
      setLoading(false);
    }
  };

  const formatClientAge = (createdAt: Date) => {
    const now = new Date().getTime();
    const clientCreationTime = createdAt.getTime();
    const diffDays = Math.floor((now - clientCreationTime) / (24 * 60 * 60 * 1000));
    
    if (diffDays < 30) {
      return `${diffDays} يوم`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} شهر`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} سنة`;
    }
  };

  const filteredClients = clients
    .filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.job?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .map(client => ({
      ...client,
      isNewClient: isClientNew(client.createdAt)
    }));

  const handleOpenAddForm = () => {
    setEditingClient(null);
    setFormData({ name: '', age: '', phone: '', job: '' });
    setShowAddForm(true);
  };

  const handleCloseAddForm = () => {
    setShowAddForm(false);
    setEditingClient(null);
    setFormData({ name: '', age: '', phone: '', job: '' });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">يجب تسجيل الدخول أولاً</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-400" />
            قائمة العملاء
          </h1>
          <div className="flex items-center gap-4">
            <div className="bg-slate-800 rounded-lg p-1 flex">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutList className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={handleOpenAddForm}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <PlusCircle className="h-5 w-5" />
              إضافة عميل
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Add/Edit Client Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingClient ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
                </h2>
                <button
                  onClick={handleCloseAddForm}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    الاسم
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    dir="rtl"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    العمر
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="rtl"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="rtl"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    التخصص الدراسي
                  </label>
                  <input
                    type="text"
                    value={formData.job}
                    onChange={(e) => setFormData({ ...formData, job: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="rtl"
                    disabled={loading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'جاري الحفظ...' : editingClient ? 'تحديث البيانات' : 'إضافة العميل'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute right-4 top-3.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث عن عميل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-12 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            dir="rtl"
          />
        </div>

        {loading && clients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-slate-400">جاري تحميل البيانات...</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20 hover:border-blue-500/50 transition-all hover:scale-105"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-semibold text-white">{client.name}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(client)}
                        className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        disabled={loading}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        client.isNewClient
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {client.isNewClient ? 'عميل جديد' : 'عميل دائم'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="h-4 w-4" />
                      <span>{client.phone || 'لا يوجد'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Briefcase className="h-4 w-4" />
                      <span>{client.job || 'لا يوجد'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock className="h-4 w-4" />
                      <span>آخر زيارة: {client.lastVisit.toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-slate-400">
                        العمر: {client.age ? `${client.age} سنة` : 'غير محدد'}
                      </p>
                      <p className="text-sm text-slate-400">
                        عضو منذ: {formatClientAge(client.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">الاسم</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">العمر</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">رقم الهاتف</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">التخصص</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">عضو منذ</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">الحالة</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">تعديل</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} className="border-b border-slate-700/50 hover:bg-white/5">
                    <td className="px-6 py-4 text-white">{client.name}</td>
                    <td className="px-6 py-4 text-slate-300">{client.age ? `${client.age} سنة` : 'غير محدد'}</td>
                    <td className="px-6 py-4 text-slate-300">{client.phone || 'لا يوجد'}</td>
                    <td className="px-6 py-4 text-slate-300">{client.job || 'لا يوجد'}</td>
                    <td className="px-6 py-4 text-slate-300">{formatClientAge(client.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        client.isNewClient
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {client.isNewClient ? 'عميل جديد' : 'عميل دائم'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleEdit(client)}
                        className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        disabled={loading}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredClients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-slate-400">لا يوجد عملاء مطابقين للبحث</p>
          </div>
        )}
      </div>
    </div>
  );
};