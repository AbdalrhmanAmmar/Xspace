import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ar';

dayjs.extend(relativeTime);
dayjs.locale('ar');

/* ------------------------------------------------------------------ */
/*  نوع بيانات العميل المتغيّب                                         */
/* ------------------------------------------------------------------ */
interface AbsentClient {
  id: string;
  name: string;
  /** أحدث زيارة (created_at من جدول deleted_visit) */
  lastVisit: string | null;
  daysAbsent: number;
}

/* ------------------------------------------------------------------ */
/*  المكوّن                                                             */
/* ------------------------------------------------------------------ */
export const AbsentClients: React.FC = () => {
  const [thresholdDays, setThresholdDays] = useState<number>(7);
  const [absentClients, setAbsentClients] = useState<AbsentClient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sinceDateISO = dayjs()
    .subtract(thresholdDays, 'day')
    .toISOString();

  /* -------------------------------------------------------------- */
  /*  جلب البيانات من دالة absent_clients                            */
  /* -------------------------------------------------------------- */
  const fetchAbsentClients = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('absent_clients', {
        since_date: sinceDateISO,
      });
      if (error) throw error;

      const clients: AbsentClient[] = (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.client_name ?? row.name,
        lastVisit: row.created_at ?? null,      // ← الأساس الجديد
        daysAbsent: Math.round(Number(row.days_absent ?? 0)),
      }));

      clients.sort((a, b) => b.daysAbsent - a.daysAbsent);
      setAbsentClients(clients);
    } catch (err: any) {
      console.error('Error fetching absent clients', err);
      setError(err.message ?? 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsentClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thresholdDays]);

  /* مستوى الخطورة حسب عدد الأيام */
  const getSeverity = (d: number) =>
    d > 30 ? 'high' : d > 14 ? 'medium' : 'low';

  /* ألوان الشرائح */
  const severityColors: Record<'high' | 'medium' | 'low', string> = {
    high: 'bg-red-900/30 text-red-300',
    medium: 'bg-amber-900/30 text-amber-300',
    low: 'bg-blue-900/30 text-blue-300',
  };

  /* -------------------------------------------------------------- */
  /*  الواجهة                                                        */
  /* -------------------------------------------------------------- */
  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/90 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 shadow-xl">
      {/* الترويسة + حقل الأيام */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-4 md:mb-0">
          <span className="text-blue-400">العملاء</span> المتغيبون
        </h2>

        <div className="flex items-center space-x-4 space-x-reverse">
          <label className="text-gray-300 text-sm">المدة منذ آخر حضور:</label>
          <div className="relative">
            <input
              type="number"
              min={1}
              max={365}
              value={thresholdDays}
              onChange={(e) =>
                setThresholdDays(
                  Math.min(365, Math.max(1, Number(e.target.value) || 1))
                )
              }
              className="w-24 py-2 px-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="absolute left-3 top-2 text-gray-400 text-sm">
              يوم
            </span>
          </div>
        </div>
      </div>

      {/* خطأ */}
      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-2 space-x-reverse">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* تحميل أو لا يوجد بيانات */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
        </div>
      ) : absentClients.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 mx-auto text-gray-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-gray-400 text-lg">
            لا يوجد عملاء متغيبون خلال آخر {thresholdDays} يوم
          </p>
          <p className="text-gray-500 text-sm mt-1">
            جميع العملاء حضروا خلال هذه الفترة
          </p>
        </div>
      ) : (
        /* قائمة العملاء */
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {absentClients.map((c) => {
            const sev = getSeverity(c.daysAbsent);
            return (
              <div
                key={c.id}
                className="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-colors duration-200"
              >
                <div className="flex items-center">
                  <div className="bg-gray-700 p-3 rounded-lg mr-4">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">{c.name}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {c.lastVisit ? (
                        <>
                          آخر حضور:{' '}
                          {dayjs(c.lastVisit).format('DD/MM/YYYY')}
                          <span className="mx-2">•</span>
                          {dayjs(c.lastVisit).fromNow()}
                        </>
                      ) : (
                        'لم يحضر من قبل'
                      )}
                    </p>
                  </div>
                </div>

                <div
                  className={`px-4 py-2 rounded-full text-sm font-bold ${severityColors[sev]}`}
                >
                  {c.daysAbsent} يوم
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* إجمالي */}
      {absentClients.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          عرض {absentClients.length} عميل لم يحضروا منذ أكثر من {thresholdDays}{' '}
          يوم
        </div>
      )}
    </div>
  );
};
export default AbsentClients;