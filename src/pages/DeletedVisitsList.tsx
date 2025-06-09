import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const DeletedVisitsList = () => {
  const [deletedVisits, setDeletedVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    const fetchDeletedVisits = async () => {
      try {
        setLoading(true);

        let query = supabase
          .from("deleted_visit")
          .select(`
            id,
            deleted_at,
            client_id,
            start_time,
            end_time,
            type,
            number_of_people,
            total_amount,
            client:client_id (name)
          `)
          .order("deleted_at", { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        setDeletedVisits(data || []);
      } catch (error) {
        console.error("Error fetching deleted visits:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeletedVisits();
  }, []);

  // تصفية البيانات حسب معايير البحث
  const filteredVisits = deletedVisits.filter((visit) => {
    const matchesSearch = visit.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         visit.client_id.toString().includes(searchTerm);
    const matchesDate = dateFilter ? 
                        new Date(visit.deleted_at).toLocaleDateString() === new Date(dateFilter).toLocaleDateString() : 
                        true;
    const matchesType = typeFilter ? visit.type === typeFilter : true;
    
    return matchesSearch && matchesDate && matchesType;
  });

  // أنواع الزيارات مع تسمياتها العربية
  const visitTypes = [
    { value: "default", label: "زيارة عادية" },
    { value: "big", label: "قاعة كبيرة" },
    { value: "small", label: "قاعة صغيرة" }
  ];

  // دالة لإرجاع التنسيق المناسب حسب نوع الزيارة
  const getVisitTypeStyle = (type: string) => {
    switch(type) {
      case "big":
        return {
          bgColor: "bg-purple-900",
          textColor: "text-purple-200",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          )
        };
      case "small":
        return {
          bgColor: "bg-blue-900",
          textColor: "text-blue-200",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        };
      default:
        return {
          bgColor: "bg-green-900",
          textColor: "text-green-200",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )
        };
    }
  };

  // دالة لتحويل نوع الزيارة إلى تسمية عربية
  const getArabicTypeLabel = (type: string) => {
    const foundType = visitTypes.find(t => t.value === type);
    return foundType ? foundType.label : type;
  };

  return (
    <div className="deleted-visits-container p-6 text-white max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          سجل المحذوفات
        </h2>
      </div>

      {/* لوحة التحكم بالبحث والتصفية */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">بحث بالعميل</label>
            <input
              type="text"
              placeholder="ابحث باسم العميل أو رقمه..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">تصفية بالتاريخ</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">تصفية بنوع الزيارة</label>
            <select
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">الكل</option>
              {visitTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg">لا توجد زيارات محذوفة تطابق معايير البحث</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">#</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">العميل</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">تاريخ الحذف</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">وقت البداية</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">وقت النهاية</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">نوع الزيارة</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">عدد الأشخاص</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">المبلغ</th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {filteredVisits.map((visit, index) => {
                  const typeStyle = getVisitTypeStyle(visit.type);
                  return (
                    <tr key={visit.id} className="hover:bg-slate-750 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {visit.client?.name || `العميل ${visit.client_id}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {new Date(visit.deleted_at).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {new Date(visit.start_time).toLocaleTimeString("ar-EG")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {visit.end_time ? new Date(visit.end_time).toLocaleTimeString("ar-EG") : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${typeStyle.bgColor} ${typeStyle.textColor}`}>
                          {typeStyle.icon}
                          {getArabicTypeLabel(visit.type)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-slate-300">
                        {visit.number_of_people}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-400">
                        {visit.total_amount?.toLocaleString("ar-EG")} ج.م
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-900 px-6 py-3 flex items-center justify-between border-t border-slate-700">
            <div className="text-sm text-slate-400">
              عرض <span className="font-medium">{filteredVisits.length}</span> من <span className="font-medium">{deletedVisits.length}</span> نتيجة
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletedVisitsList;