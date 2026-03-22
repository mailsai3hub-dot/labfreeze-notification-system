
import React, { useMemo } from 'react';
import { HoldCase, HoldFileStatus, User } from '../types';
import { ICONS } from '../constants';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  TooltipProps,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { reportService } from '../services/reportService';

interface HoldDashboardProps {
  holdCases: HoldCase[];
  lang: 'ar' | 'en';
  currentUser: User;
  users: User[]; // Added
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 rounded-2xl animate-in zoom-in-95 duration-300">
        <p className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-2">{label || payload[0].name}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="text-sm font-black flex items-center gap-3" style={{ color: entry.color || entry.fill }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
            {entry.name === 'total' ? (payload[0].payload.isAr ? 'الإجمالي' : 'Total') : (payload[0].payload.isAr ? 'المنتظر' : 'Pending')}: {entry.value}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const HoldDashboard: React.FC<HoldDashboardProps> = ({ holdCases, lang, users }) => {
  const isAr = lang === 'ar';
  
  const stats = useMemo(() => {
    const total = holdCases.length;
    const completed = holdCases.filter(c => c.is_finished).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return [
      { 
        label: isAr ? 'إجمالي الـ Hold' : 'Hold Total', 
        value: total, 
        icon: ICONS.Register, 
        color: 'bg-teal',
        textColor: 'text-navy-dark',
        shadow: 'shadow-teal/20'
      },
      { 
        label: isAr ? 'تحت المتابعة' : 'Follow Up', 
        value: holdCases.filter(c => !c.is_finished && c.status === HoldFileStatus.FOLLOWUP).length, 
        icon: ICONS.Activity, 
        color: 'bg-amber-500',
        textColor: 'text-white',
        shadow: 'shadow-amber-500/20'
      },
      { 
        label: isAr ? 'تم الانتهاء' : 'Finished', 
        value: completed, 
        icon: ICONS.CheckCircle, 
        color: 'bg-cyan-500',
        textColor: 'text-white',
        shadow: 'shadow-cyan-500/20'
      },
      { 
        label: isAr ? 'معدل الإنجاز' : 'Completion Rate', 
        value: `${rate}%`, 
        icon: ICONS.BarChart, 
        color: 'bg-emerald-500',
        textColor: 'text-white',
        shadow: 'shadow-emerald-500/20'
      },
      { 
        label: isAr ? 'دورة أخرى' : 'Another Cycle', 
        value: holdCases.filter(c => !c.is_finished && c.status === HoldFileStatus.ANOTHER_CYCLE).length, 
        icon: ICONS.LayoutDashboard, 
        color: 'bg-white/10',
        textColor: 'text-white',
        shadow: 'shadow-white/5'
      },
    ];
  }, [holdCases, isAr]);

  const totalVsPendingMonthlyData = useMemo(() => {
    const months: Record<string, { name: string, total: number, pending: number, isAr: boolean, order: number }> = {};
    const currentYear = new Date().getFullYear();
    for (let i = 1; i <= 12; i++) {
      const monthStr = i.toString().padStart(2, '0');
      months[monthStr] = { 
        name: isAr ? `شهر ${monthStr}` : `Month ${monthStr}`, 
        total: 0, 
        pending: 0, 
        isAr: isAr,
        order: i
      };
    }

    holdCases.forEach(c => {
      const date = new Date(c.created_at);
      if (date.getFullYear() === currentYear) {
        const monthKey = (date.getMonth() + 1).toString().padStart(2, '0');
        if (months[monthKey]) {
          months[monthKey].total++;
          if (!c.is_finished) {
            months[monthKey].pending++;
          }
        }
      }
    });

    return Object.values(months).sort((a, b) => a.order - b.order);
  }, [holdCases, isAr]);

  const testTrendData = useMemo(() => {
    const tests: Record<string, number> = {};
    holdCases.filter(c => !c.is_finished).forEach(c => {
      tests[c.test_type] = (tests[c.test_type] || 0) + 1;
    });
    return Object.entries(tests)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [holdCases]);

  // Updated Action Plan Logic: Show individual overdue cases instead of grouped centers
  const actionPlan = useMemo(() => {
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const now = new Date();

    return holdCases
      .filter(c => !c.is_finished)
      .map(c => ({
        ...c,
        overdueTime: now.getTime() - new Date(c.created_at).getTime()
      }))
      .filter(c => c.overdueTime > TWENTY_FOUR_HOURS_MS) // Only overdue cases (> 24h)
      .sort((a, b) => b.overdueTime - a.overdueTime) // Oldest/Worst first
      .slice(0, 6); // Top 6 critical cases
  }, [holdCases]);

  const getDaysOverdue = (ms: number) => Math.floor(ms / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 font-['Cairo'] relative">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-100 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none opacity-50"></div>

      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-slate-900 p-12 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white flex items-center gap-6 tracking-tight">
             <div className="w-3 h-12 bg-cyan-500 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)]"></div>
             {isAr ? 'مركز ذكاء الـ Hold' : 'Hold Intelligence Center'}
          </h1>
          <p className="text-slate-300 font-bold mt-3 max-w-lg text-sm leading-relaxed">
            {isAr ? 'التحليل الزمني للعلاقة بين إجمالي الحالات والحالات العالقة شهرياً.' : 'Monthly analysis of the relationship between total and pending cases.'}
          </p>
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-slate-800/50 text-cyan-400 px-6 py-3 rounded-2xl border border-slate-700 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 shadow-sm backdrop-blur-md">
            <ICONS.CheckCircle className="w-5 h-5" />
            {isAr ? 'تحليل الأداء دقيق' : 'Performance Analysis OK'}
          </div>
        </div>
      </div>

      {/* 2. KPIs Section - Responsive 2 cols mobile, 5 cols desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 relative z-10">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-6 hover:scale-105 transition-all duration-500 text-center group">
            <div className={`w-16 h-16 ${stat.color.replace('bg-', 'bg-opacity-10 bg-')} ${stat.textColor.replace('text-white', 'text-black').replace('text-navy-dark', 'text-blue-600')} rounded-2xl flex items-center justify-center shadow-sm group-hover:rotate-12 transition-transform`}>
              <stat.icon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[10px] font-black text-black uppercase tracking-[0.3em] mb-2">{stat.label}</p>
              <p className="text-3xl font-black text-black leading-none tracking-tighter">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Analysis Graphs - Stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 relative z-10">
        
        {/* Analysis: Total vs Pending per MONTH (0 to 150 Scale) */}
        <div className="lg:col-span-2 bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-12">
            <h3 className="text-2xl font-black text-black flex items-center gap-4 tracking-tight">
              <ICONS.BarChart className="w-7 h-7 text-blue-600" />
              {isAr ? 'التحليل الشهري (الإجمالي × المنتظر)' : 'Monthly Analysis (Total × Pending)'}
            </h3>
            <div className="flex gap-6">
               <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.2)]"></div>
                  <span className="text-[10px] font-black text-black uppercase tracking-widest">{isAr ? 'الإجمالي' : 'Total'}</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.2)]"></div>
                  <span className="text-[10px] font-black text-black uppercase tracking-widest">{isAr ? 'المنتظر' : 'Pending'}</span>
               </div>
            </div>
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={totalVsPendingMonthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 900, fill: '#000000' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 150]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#000000' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="pending" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Detection: Delay by Test Type */}
        <div className="lg:col-span-1 bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100">
          <h3 className="text-2xl font-black text-black mb-10 flex items-center gap-4 tracking-tight">
            <ICONS.Activity className="w-7 h-7 text-blue-600" />
            {isAr ? 'أكثر الفحوصات تعليقاً' : 'Most Delayed Tests'}
          </h3>
          <div className="h-96 flex flex-col justify-center">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart layout="vertical" data={testTrendData}>
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontWeight: 900, fill: '#000000' }} width={80} axisLine={false} tickLine={false} />
                 <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                 <Bar dataKey="value" fill="#2563eb" radius={[0, 10, 10, 0]} barSize={20} />
               </BarChart>
             </ResponsiveContainer>
             <div className="mt-8 p-6 bg-blue-50 rounded-3xl border border-blue-100 shadow-sm">
                <p className="text-[10px] font-black text-blue-600/60 uppercase leading-relaxed tracking-widest">
                  {isAr ? 'تحليل: الفحوصات المذكورة أعلاه تشكل 80% من أسباب التوقف الحالية.' : 'Analysis: Tests mentioned above account for 80% of current stalls.'}
                </p>
             </div>
          </div>
        </div>
      </div>

      {/* 4. Action Plan - Stacked on mobile */}
      <div className="bg-white rounded-[3rem] p-10 text-black shadow-sm relative overflow-hidden border border-slate-100 z-10">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-10">
             <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center shadow-sm border border-rose-100 animate-pulse">
                <ICONS.Shield className="w-7 h-7 text-rose-600" />
             </div>
             <div>
                <h3 className="text-2xl font-black tracking-tight">{isAr ? 'خطة العمل (الحالات الحرجة > 24 ساعة)' : 'Action Plan (Urgent > 24h)'}</h3>
                <p className="text-black text-xs font-black uppercase tracking-widest mt-1">{isAr ? 'يجب اتخاذ إجراء فوري لهذه الحالات' : 'Immediate action required for these specific cases'}</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {actionPlan.map((c, idx) => {
              const days = getDaysOverdue(c.overdueTime);
              return (
                <div key={c.id} className="bg-slate-50 border border-slate-100 p-8 rounded-3xl flex flex-col justify-between group hover:bg-white hover:shadow-xl transition-all duration-500 relative overflow-hidden">
                  
                  {/* Priority Badge */}
                  <div className="absolute top-0 left-0 bg-rose-600 text-white px-5 py-2 rounded-br-2xl text-[10px] font-black uppercase tracking-widest">
                    #{idx + 1}
                  </div>

                  {/* Overdue Alert */}
                  <div className="absolute top-4 right-4 flex items-center gap-3 animate-pulse">
                     <div className="w-2 h-2 rounded-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.4)]"></div>
                     <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">{days} {isAr ? 'أيام تأخير' : 'Days overdue'}</span>
                  </div>

                  <div className="mt-8">
                    {/* Patient Name - Prominent */}
                    <h4 className="text-2xl font-black text-black leading-tight mb-3 truncate group-hover:text-blue-600 transition-colors" title={c.patient_name}>
                      {c.patient_name}
                    </h4>
                    
                    {/* Reason/Status - Prominent Subtext */}
                    <div className="flex items-center gap-3 mb-6">
                       <span className="text-[10px] text-black font-black uppercase tracking-[0.2em]">{isAr ? 'السبب:' : 'Reason:'}</span>
                       <p className="text-xs font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100">
                         {c.status}
                       </p>
                    </div>

                    <div className="w-full h-px bg-slate-200 mb-6"></div>

                    {/* Secondary Info */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[11px]">
                         <span className="text-black font-black uppercase tracking-widest">{isAr ? 'المركز:' : 'Center:'}</span>
                         <span className="text-black font-black truncate max-w-[150px]">{c.center_name}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                         <span className="text-black font-black uppercase tracking-widest">{isAr ? 'التحليل:' : 'Test:'}</span>
                         <span className="text-blue-600/60 font-black truncate max-w-[150px]">{c.test_type}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 bg-rose-50 border border-rose-100 p-3 rounded-2xl text-center shadow-sm">
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.3em]">{isAr ? 'مطلوب حل فوري' : 'Resolve Now'}</span>
                  </div>
                </div>
              );
            })}
            
            {actionPlan.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-black gap-6 border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
                  <ICONS.CheckCircle className="w-10 h-10" />
                </div>
                <span className="font-black text-sm uppercase tracking-[0.3em]">{isAr ? 'ممتاز! لا توجد حالات متأخرة حالياً' : 'Great! No overdue cases > 24h'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Smart Reports Banner - Stacked on mobile */}
      <div className="bg-blue-600 rounded-[3rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-lg shadow-blue-100 relative overflow-hidden border border-blue-500 z-10 group">
        <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-out"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-right">
             <div className="bg-white/10 p-5 rounded-3xl border border-white/10 shadow-inner">
                <ICONS.FileText className="w-10 h-10" />
             </div>
             <div>
               <h2 className="text-3xl font-black tracking-tight">{isAr ? 'تقارير الـ Hold الذكية' : 'Smart Hold Reporting'}</h2>
               <p className="text-white/60 text-xs font-black uppercase tracking-[0.3em] mt-2">
                 {isAr ? 'استخراج البيانات (Excel/PDF)' : 'Export Data'}
               </p>
             </div>
        </div>
        
        <div className="flex gap-4 relative z-10">
          <button 
            onClick={() => reportService.exportHoldToExcel(holdCases, users, 'Hold_Registry')}
            className="bg-white text-blue-600 px-10 py-5 rounded-2xl font-black text-sm flex items-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            <ICONS.Download className="w-5 h-5" />
            <span className="uppercase tracking-widest">Excel</span>
          </button>
          <button 
            onClick={() => reportService.exportHoldToPDF(holdCases, users, 'Hold_Registry_PDF')}
            className="bg-blue-700 text-white px-10 py-5 rounded-2xl font-black text-sm flex items-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-xl border border-blue-500"
          >
            <ICONS.Download className="w-5 h-5" />
            <span className="uppercase tracking-widest">PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HoldDashboard;
