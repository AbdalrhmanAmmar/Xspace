import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { 
  CalendarDays, 
  DollarSign, 
  Wrench, 
  BookOpen, 
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  FileText,
  Plus,
  Download,
  Printer,
  ArrowLeft,
  ArrowRight,
  Filter,
  ChevronDown,
  ChevronUp,
  X
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { format, subDays, addDays, isSameDay, parseISO } from "date-fns";
import { ar } from "date-fns/locale";

interface ArchiveData {
  hourly_revenue: number;
  subscription_revenue: number;
  reservation_revenue: number;
  product_revenue: number;
  total_revenue: number;
  maintenance: number;
  daily_expenses?: number;
  salaries: number;
  total_expenses: number;
  net_profit: number;
  notes: string | null;
  date: string;
}

export default function MoneyArchive() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [data, setData] = useState<ArchiveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<Partial<ArchiveData>>({});
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });
  const [filteredData, setFilteredData] = useState<ArchiveData[]>([]);
  const [viewMode, setViewMode] = useState<"single" | "range">("single");

  useEffect(() => {
    if (viewMode === "single") {
      fetchDataForDate(selectedDate);
    } else {
      if (dateRange.start && dateRange.end) {
        fetchDataForRange(dateRange.start, dateRange.end);
      }
    }
  }, [selectedDate, dateRange, viewMode]);

  const fetchDataForDate = async (date: Date) => {
    setLoading(true);
    setError(null);

    const formatted = format(date, 'yyyy-MM-dd');
    const { data: queryData, error } = await supabase
      .from("profit_archive")
      .select("*")
      .eq("date", formatted);

    if (error) {
      console.error('Supabase error:', error);
      setError("حدث خطأ في جلب البيانات.");
      setData(null);
    } else if (!queryData || queryData.length === 0) {
      setError("لم يتم العثور على بيانات لهذا التاريخ.");
      setData(null);
      setEditedData({
        hourly_revenue: 0,
        subscription_revenue: 0,
        reservation_revenue: 0,
        product_revenue: 0,
        maintenance: 0,
        daily_expenses: 0,
        salaries: 0,
        notes: null
      });
    } else {
      const data = queryData[0];
      setData({
        hourly_revenue: data.hourly_revenue || 0,
        subscription_revenue: data.subscription_revenue || 0,
        reservation_revenue: data.reservation_revenue || 0,
        product_revenue: data.product_revenue || 0,
        total_revenue: data.total_revenue || 0,
        maintenance: data.maintenance || 0,
        daily_expenses: data.daily_expenses || 0,
        salaries: data.salaries || 0,
        total_expenses: data.total_expenses || 0,
        net_profit: data.net_profit || 0,
        notes: data.notes || null,
        date: data.date
      });
      setEditedData({
        hourly_revenue: data.hourly_revenue || 0,
        subscription_revenue: data.subscription_revenue || 0,
        reservation_revenue: data.reservation_revenue || 0,
        product_revenue: data.product_revenue || 0,
        maintenance: data.maintenance || 0,
        daily_expenses: data.daily_expenses || 0,
        salaries: data.salaries || 0,
        notes: data.notes || null
      });
    }

    setLoading(false);
  };

  const fetchDataForRange = async (startDate: Date, endDate: Date) => {
    setLoading(true);
    setError(null);

    const start = format(startDate, 'yyyy-MM-dd');
    const end = format(endDate, 'yyyy-MM-dd');

    const { data: queryData, error } = await supabase
      .from("profit_archive")
      .select("*")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      setError("حدث خطأ في جلب البيانات.");
      setFilteredData([]);
    } else {
      setFilteredData(queryData || []);
      if (queryData && queryData.length > 0) {
        // Set the first date in range as selected date for single view
        setSelectedDate(parseISO(queryData[0].date));
      }
    }

    setLoading(false);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(direction === 'prev' ? subDays(selectedDate, 1) : addDays(selectedDate, 1));
  };

  const handleEditToggle = () => {
    if (editMode) {
      setEditedData(data || {
        hourly_revenue: 0,
        subscription_revenue: 0,
        reservation_revenue: 0,
        product_revenue: 0,
        maintenance: 0,
        daily_expenses: 0,
        salaries: 0,
        notes: null
      });
    } else if (!data) {
      const newRecord = {
        hourly_revenue: 0,
        subscription_revenue: 0,
        reservation_revenue: 0,
        product_revenue: 0,
        maintenance: 0,
        daily_expenses: 0,
        salaries: 0,
        notes: null,
        date: format(selectedDate, 'yyyy-MM-dd')
      };
      setEditedData(newRecord);
    }
    setEditMode(!editMode);
  };

  const handleInputChange = (field: keyof ArchiveData, value: number | string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? value : Number(value) || 0
    }));
  };

  const calculateTotals = (data: Partial<ArchiveData>) => {
    const hourly = data.hourly_revenue || 0;
    const subscription = data.subscription_revenue || 0;
    const reservation = data.reservation_revenue || 0;
    const product = data.product_revenue || 0;
    const maintenance = data.maintenance || 0;
    const dailyExpenses = data.daily_expenses || 0;
    const salaries = data.salaries || 0;

    return {
      total_revenue: hourly + subscription + reservation + product,
      total_expenses: maintenance + dailyExpenses + salaries,
      net_profit: (hourly + subscription + reservation + product) - (maintenance + dailyExpenses + salaries)
    };
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const totals = calculateTotals(editedData);

    const updates = {
      ...editedData,
      ...totals,
      date: formattedDate,
      updated_at: new Date().toISOString()
    };

    const { data: updatedData, error } = await supabase
      .from("profit_archive")
      .upsert(updates)
      .eq("date", formattedDate)
      .select()
      .single();

    if (error) {
      setError("حدث خطأ أثناء حفظ التغييرات: " + error.message);
    } else {
      setData({
        ...updatedData,
        daily_expenses: updatedData.daily_expenses || 0
      });
      setEditMode(false);
    }

    setLoading(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const updatedNotes = data?.notes 
      ? `${data.notes}\n${format(new Date(), 'yyyy-MM-dd HH:mm')}: ${newNote}`
      : `${format(new Date(), 'yyyy-MM-dd HH:mm')}: ${newNote}`;

    const { error } = await supabase
      .from("profit_archive")
      .update({ notes: updatedNotes })
      .eq("date", format(selectedDate, 'yyyy-MM-dd'));

    if (!error) {
      setData(prev => prev ? { ...prev, notes: updatedNotes } : null);
      setNewNote("");
      setShowNotesInput(false);
    }
  };



  const applyDateRangeFilter = () => {
    if (dateRange.start && dateRange.end) {
      setViewMode("range");
      fetchDataForRange(dateRange.start, dateRange.end);
    }
  };

  const clearDateRangeFilter = () => {
    setDateRange({ start: null, end: null });
    setViewMode("single");
    setFilteredData([]);
  };

  const calculateRangeTotals = () => {
    return filteredData.reduce((acc, item) => ({
      hourly_revenue: acc.hourly_revenue + item.hourly_revenue,
      subscription_revenue: acc.subscription_revenue + item.subscription_revenue,
      reservation_revenue: acc.reservation_revenue + item.reservation_revenue,
      product_revenue: acc.product_revenue + item.product_revenue,
      total_revenue: acc.total_revenue + item.total_revenue,
      maintenance: acc.maintenance + item.maintenance,
      daily_expenses: (acc.daily_expenses || 0) + (item.daily_expenses || 0),
      salaries: acc.salaries + item.salaries,
      total_expenses: acc.total_expenses + item.total_expenses,
      net_profit: acc.net_profit + item.net_profit
    }), {
      hourly_revenue: 0,
      subscription_revenue: 0,
      reservation_revenue: 0,
      product_revenue: 0,
      total_revenue: 0,
      maintenance: 0,
      daily_expenses: 0,
      salaries: 0,
      total_expenses: 0,
      net_profit: 0
    });
  };

  const rangeTotals = calculateRangeTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 print:bg-white print:text-black">
      <div className="max-w-6xl mx-auto bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 p-8 space-y-6 print:border-none print:shadow-none print:rounded-none print:p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-400 flex items-center gap-2">
              <FileText className="h-8 w-8" />
              أرشيف الفلوس
            </h1>
            <p className="text-slate-400 mt-1">
              نظام متكامل لتتبع الإيرادات والمصروفات اليومية
            </p>
          </div>
          
          <div className="flex items-center gap-3">

 
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-xl">
          <div className="flex items-center gap-3">
            {viewMode === "single" ? (
              <>
                <button 
                  onClick={() => navigateDate('prev')}
                  className="p-2 rounded-full hover:bg-slate-800 transition-colors"
                  title="اليوم السابق"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-blue-300" />
                  <DatePicker
                    selected={selectedDate}
                    onChange={(d) => d && setSelectedDate(d)}
                    className="bg-slate-800 text-blue-200 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    dateFormat="yyyy-MM-dd"
                    locale={ar}
                    todayButton="اليوم"
                    isClearable={false}
                    maxDate={new Date()}
                  />
                </div>
                
                <button 
                  onClick={() => navigateDate('next')}
                  className="p-2 rounded-full hover:bg-slate-800 transition-colors"
                  title="اليوم التالي"
                  disabled={isSameDay(selectedDate, new Date())}
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 text-blue-300">
                <CalendarDays className="h-5 w-5" />
                <span>
                  {dateRange.start ? format(dateRange.start, 'yyyy-MM-dd') : '...'} 
                  {' → '} 
                  {dateRange.end ? format(dateRange.end, 'yyyy-MM-dd') : '...'}
                </span>
                {filteredData.length > 0 && (
                  <span className="text-slate-400 text-sm">
                    ({filteredData.length} يوم)
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${showAdvancedFilter ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-700'}`}
            >
              <Filter className="h-4 w-4" />
              <span>فلترة متقدمة</span>
              {showAdvancedFilter ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {viewMode === "single" && (
              <button 
                onClick={handleEditToggle}
                className={`px-4 py-2 rounded-lg transition-colors ${editMode ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {editMode ? 'إلغاء التعديل' : 'تعديل البيانات'}
              </button>
            )}
          </div>
        </div>

        {showAdvancedFilter && (
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <h3 className="text-lg font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              فلترة حسب النطاق الزمني
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">من تاريخ</label>
                <DatePicker
                  selected={dateRange.start}
                  onChange={(date) => setDateRange({...dateRange, start: date})}
                  selectsStart
                  startDate={dateRange.start}
                  endDate={dateRange.end}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  dateFormat="yyyy-MM-dd"
                  locale={ar}
                  maxDate={new Date()}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">إلى تاريخ</label>
                <DatePicker
                  selected={dateRange.end}
                  onChange={(date) => setDateRange({...dateRange, end: date})}
                  selectsEnd
                  startDate={dateRange.start}
                  endDate={dateRange.end}
                  minDate={dateRange.start}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  dateFormat="yyyy-MM-dd"
                  locale={ar}
                  maxDate={new Date()}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={clearDateRangeFilter}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                إلغاء الفلترة
              </button>
              
              <button
                onClick={applyDateRangeFilter}
                disabled={!dateRange.start || !dateRange.end}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                تطبيق الفلترة
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-slate-400">جاري تحميل البيانات...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
            <p className="text-red-400 text-lg">{error}</p>
            {viewMode === "single" && (
              <button 
                onClick={handleEditToggle}
                className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
              >
                إنشاء سجل جديد لهذا التاريخ
              </button>
            )}
          </div>
        ) : viewMode === "single" ? (
          (data || editMode) && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                <RevenueCard
                  title="إيراد الساعات"
                  icon={BookOpen}
                  value={data?.hourly_revenue || 0}
                  editMode={editMode}
                  editedValue={editedData.hourly_revenue}
                  onValueChange={(v) => handleInputChange('hourly_revenue', v)}
                />
                <RevenueCard
                  title="إيراد الاشتراكات"
                  icon={Users}
                  value={data?.subscription_revenue || 0}
                  editMode={editMode}
                  editedValue={editedData.subscription_revenue}
                  onValueChange={(v) => handleInputChange('subscription_revenue', v)}
                />
                <RevenueCard
                  title="إيراد الحجوزات"
                  icon={CalendarDays}
                  value={data?.reservation_revenue || 0}
                  editMode={editMode}
                  editedValue={editedData.reservation_revenue}
                  onValueChange={(v) => handleInputChange('reservation_revenue', v)}
                />
                <RevenueCard
                  title="إيراد المنتجات"
                  icon={Package}
                  value={data?.product_revenue || 0}
                  editMode={editMode}
                  editedValue={editedData.product_revenue}
                  onValueChange={(v) => handleInputChange('product_revenue', v)}
                />
                <ExpenseCard
                  title="مصاريف الصيانة"
                  icon={Wrench}
                  value={data?.maintenance || 0}
                  editMode={editMode}
                  editedValue={editedData.maintenance}
                  onValueChange={(v) => handleInputChange('maintenance', v)}
                />
                <ExpenseCard
                  title="مصروف يومي"
                  icon={DollarSign}
                  value={data?.daily_expenses || 0}
                  editMode={editMode}
                  editedValue={editedData.daily_expenses}
                  onValueChange={(v) => handleInputChange('daily_expenses', v)}
                />
                <ExpenseCard
                  title="مرتبات"
                  icon={Users}
                  value={data?.salaries || 0}
                  editMode={editMode}
                  editedValue={editedData.salaries}
                  onValueChange={(v) => handleInputChange('salaries', v)}
                />
                <SummaryCard
                  title="إجمالي الإيرادات"
                  icon={TrendingUp}
                  value={data?.total_revenue || 0}
                  type="revenue"
                />
                <SummaryCard
                  title="إجمالي المصروفات"
                  icon={TrendingDown}
                  value={data?.total_expenses || 0}
                  type="expense"
                />
                <SummaryCard
                  title="صافي الربح"
                  icon={DollarSign}
                  value={data?.net_profit || 0}
                  type={data?.net_profit && data.net_profit >= 0 ? "profit" : "loss"}
                  className="md:col-span-2 lg:col-span-3"
                />
              </div>

              {editMode && (
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleSaveChanges}
                    className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                  >
                    حفظ التغييرات
                  </button>
                </div>
              )}

              <div className="mt-8">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-semibold text-blue-300 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    الملاحظات
                  </h3>
                  {!showNotesInput && (
                    <button
                      onClick={() => setShowNotesInput(true)}
                      className="text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      إضافة ملاحظة
                    </button>
                  )}
                </div>
                
                {showNotesInput && (
                  <div className="mb-4">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="اكتب ملاحظة جديدة..."
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => {
                          setShowNotesInput(false);
                          setNewNote("");
                        }}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={handleAddNote}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-1"
                        disabled={!newNote.trim()}
                      >
                        <Plus className="h-3 w-3" />
                        حفظ الملاحظة
                      </button>
                    </div>
                  </div>
                )}
                
                {data?.notes ? (
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <div className="whitespace-pre-wrap text-slate-300">{data.notes}</div>
                  </div>
                ) : (
                  <div className="bg-slate-800/30 p-4 rounded-lg border border-dashed border-slate-700 text-center text-slate-500">
                    لا توجد ملاحظات مسجلة
                  </div>
                )}
              </div>
            </>
          )
        ) : (
          <>
            {filteredData.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  <SummaryCard
                    title="إجمالي إيراد الساعات"
                    icon={BookOpen}
                    value={rangeTotals.hourly_revenue}
                    type="revenue"
                  />
                  <SummaryCard
                    title="إجمالي إيراد الاشتراكات"
                    icon={Users}
                    value={rangeTotals.subscription_revenue}
                    type="revenue"
                  />
                  <SummaryCard
                    title="إجمالي إيراد الحجوزات"
                    icon={CalendarDays}
                    value={rangeTotals.reservation_revenue}
                    type="revenue"
                  />
                  <SummaryCard
                    title="إجمالي إيراد المنتجات"
                    icon={Package}
                    value={rangeTotals.product_revenue}
                    type="revenue"
                  />
                  <SummaryCard
                    title="إجمالي مصاريف الصيانة"
                    icon={Wrench}
                    value={rangeTotals.maintenance}
                    type="expense"
                  />
                  <SummaryCard
                    title="إجمالي المصروف اليومي"
                    icon={DollarSign}
                    value={rangeTotals.daily_expenses || 0}
                    type="expense"
                  />
                  <SummaryCard
                    title="إجمالي المرتبات"
                    icon={Users}
                    value={rangeTotals.salaries}
                    type="expense"
                  />
                  <SummaryCard
                    title="إجمالي الإيرادات"
                    icon={TrendingUp}
                    value={rangeTotals.total_revenue}
                    type="revenue"
                  />
                  <SummaryCard
                    title="إجمالي المصروفات"
                    icon={TrendingDown}
                    value={rangeTotals.total_expenses}
                    type="expense"
                  />
                  <SummaryCard
                    title="صافي الربح"
                    icon={DollarSign}
                    value={rangeTotals.net_profit}
                    type={rangeTotals.net_profit >= 0 ? "profit" : "loss"}
                    className="md:col-span-2 lg:col-span-3"
                  />
                </div>

                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-blue-300 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    التفاصيل اليومية
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-slate-300">
                          <th className="p-3 text-right border border-slate-700">التاريخ</th>
                          <th className="p-3 text-right border border-slate-700">إيراد الساعات</th>
                          <th className="p-3 text-right border border-slate-700">إيراد الاشتراكات</th>
                          <th className="p-3 text-right border border-slate-700">إيراد الحجوزات</th>
                          <th className="p-3 text-right border border-slate-700">إيراد المنتجات</th>
                          <th className="p-3 text-right border border-slate-700">إجمالي الإيرادات</th>
                          <th className="p-3 text-right border border-slate-700">صافي الربح</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((item) => (
                          <tr key={item.date} className="hover:bg-slate-800/50">
                            <td className="p-3 border border-slate-700">{item.date}</td>
                            <td className="p-3 border border-slate-700">{item.hourly_revenue.toLocaleString('ar-EG')}</td>
                            <td className="p-3 border border-slate-700">{item.subscription_revenue.toLocaleString('ar-EG')}</td>
                            <td className="p-3 border border-slate-700">{item.reservation_revenue.toLocaleString('ar-EG')}</td>
                            <td className="p-3 border border-slate-700">{item.product_revenue.toLocaleString('ar-EG')}</td>
                            <td className="p-3 border border-slate-700 font-medium text-emerald-400">{item.total_revenue.toLocaleString('ar-EG')}</td>
                            <td className={`p-3 border border-slate-700 font-bold ${item.net_profit >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
                              {item.net_profit.toLocaleString('ar-EG')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-slate-800/30 p-8 rounded-xl border border-dashed border-slate-700 text-center">
                <p className="text-slate-400 text-lg">لا توجد بيانات متاحة للنطاق الزمني المحدد</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RevenueCard({
  title,
  icon: Icon,
  value,
  editMode,
  editedValue,
  onValueChange
}: {
  title: string;
  icon: any;
  value: number;
  editMode: boolean;
  editedValue?: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-xl p-5 shadow-inner flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <Icon className="h-5 w-5 text-blue-200" />
        <h3 className="text-blue-100 font-medium">{title}</h3>
      </div>
      
      {editMode ? (
        <input
          type="number"
          value={editedValue || 0}
          onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)}
          className="bg-blue-800/50 border border-blue-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      ) : (
        <p className="text-2xl font-bold text-white">
          {value.toLocaleString("ar-EG")} ج.م
        </p>
      )}
    </div>
  );
}

function ExpenseCard({
  title,
  icon: Icon,
  value,
  editMode,
  editedValue,
  onValueChange
}: {
  title: string;
  icon: any;
  value: number;
  editMode: boolean;
  editedValue?: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className="bg-gradient-to-br from-red-900 to-red-700 rounded-xl p-5 shadow-inner flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <Icon className="h-5 w-5 text-red-200" />
        <h3 className="text-red-100 font-medium">{title}</h3>
      </div>
      
      {editMode ? (
        <input
          type="number"
          value={editedValue || 0}
          onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)}
          className="bg-red-800/50 border border-red-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-400"
        />
      ) : (
        <p className="text-2xl font-bold text-white">
          {value.toLocaleString("ar-EG")} ج.م
        </p>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  icon: Icon,
  value,
  type,
  className = ""
}: {
  title: string;
  icon: any;
  value: number;
  type: "revenue" | "expense" | "profit" | "loss";
  className?: string;
}) {
  const colors = {
    revenue: "from-emerald-900 to-emerald-700",
    expense: "from-amber-900 to-amber-700",
    profit: "from-teal-900 to-teal-700",
    loss: "from-rose-900 to-rose-700"
  };
  
  return (
    <div className={`${colors[type]} rounded-xl p-5 shadow-inner flex flex-col ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <Icon className="h-5 w-5 text-white" />
        <h3 className="text-white font-medium">{title}</h3>
      </div>
      <p className="text-2xl font-bold text-white">
        {value.toLocaleString("ar-EG")} ج.م
      </p>
      {type === "profit" && value >= 0 && (
        <p className="text-sm mt-2 text-teal-200">✅ ربح</p>
      )}
      {type === "profit" && value < 0 && (
        <p className="text-sm mt-2 text-rose-200">❌ خسارة</p>
      )}
    </div>
  );
}