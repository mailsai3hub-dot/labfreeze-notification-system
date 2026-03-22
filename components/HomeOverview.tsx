import React, { useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { reportService } from '../services/reportService';
import { ICONS } from '../constants';
import { Sample, HoldCase, View, SampleStatus, InventorySchedule, User, HoldFileStatus } from '../types';

interface HomeOverviewProps {
  samples: Sample[];
  holdCases: HoldCase[];
  schedules?: InventorySchedule[];
  lang: 'ar' | 'en';
  currentUser?: User;
  users: User[];
  setView: (view: View) => void;
  onAddSample?: () => void;
  onNavigate: (view: View, filter?: string) => void;
}

const HomeOverview: React.FC<HomeOverviewProps> = ({ 
  samples = [], 
  holdCases = [], 
  lang, 
  currentUser,
  users = [],
  setView, 
  onNavigate 
}) => {
  const isAr = lang === 'ar';

  // --- KPI Data Calculation ---
  const kpiData = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const todaysSamples = samples.filter(s => s.created_at.startsWith(todayStr));
    // Pending samples: Not finished and not deleted
    const pendingSamples = samples.filter(s => s.status !== SampleStatus.FINISHED && s.status !== SampleStatus.DELETED);
    const totalSamples = samples.length;
    
    // Calculate active holds (from registry + samples marked as hold)
    const activeHolds = holdCases.filter(c => !c.is_finished).length + 
                       samples.filter(s => s.status === SampleStatus.HOLD).length;

    // Mock capacity for demo (assuming 5000 max capacity)
    const capacity = 5000;
    const capacityPercentage = Math.round((totalSamples / capacity) * 100);

    return [
      {
        id: 1,
        label: isAr ? 'نشاط اليوم' : "Today's Activity",
        value: todaysSamples.length,
        subValue: isAr ? 'عينات جديدة' : 'New Samples',
        icon: ICONS.Activity,
        color: 'cyan',
        bg: 'bg-cyan-500/10',
        text: 'text-cyan-400',
        trend: '+12%', // Mock
        trendUp: true
      },
      {
        id: 2,
        label: isAr ? 'سعة التخزين' : 'Storage Capacity',
        value: `${capacityPercentage}%`,
        subValue: `${totalSamples} / ${capacity}`,
        icon: ICONS.Database,
        color: 'teal',
        bg: 'bg-teal-500/10',
        text: 'text-teal',
        trend: '+5%', // Mock
        trendUp: true
      },
      {
        id: 3,
        label: isAr ? 'عينات نشطة (الثلاجة)' : 'Active Samples (Fridge)',
        value: pendingSamples.length,
        subValue: isAr ? 'قيد المعالجة' : 'In Progress',
        icon: ICONS.Clock,
        color: 'amber',
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        trend: '-2%', // Mock
        trendUp: false
      },
      {
        id: 4,
        label: isAr ? 'حالات Hold' : 'Active Holds',
        value: activeHolds,
        subValue: isAr ? 'تتطلب إجراء' : 'Action Required',
        icon: ICONS.AlertCircle,
        color: 'rose',
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        trend: '+3', // Mock
        trendUp: true
      }
    ];
  }, [samples, holdCases, isAr]);

  // --- Chart Data Preparation ---
  const chartData = useMemo(() => {
    // 1. Weekly Activity (Line Chart)
    const days = [];
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = samples.filter(s => s.created_at.startsWith(dateStr)).length;
      days.push({
        name: d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short' }),
        value: count,
        fullDate: dateStr
      });
    }

    // 2. Sample Types (Donut Chart)
    const typeCounts: Record<string, number> = {};
    samples.forEach(s => {
      const type = s.tube_type || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const donutData = Object.keys(typeCounts)
      .map((type, index) => ({
        name: type,
        value: typeCounts[type],
        color: ['#06b6d4', '#0d9488', '#0891b2', '#14b8a6', '#22d3ee', '#5eead4'][index % 6]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 types

    return { weeklyData: days, donutData };
  }, [samples, isAr]);

  // --- Recent Updates Mock Data ---
  const recentUpdates = [
    { id: 1, title: isAr ? 'تحديث النظام v2.9' : 'System Update v2.9', time: '2h ago', type: 'system', desc: 'Performance improvements and UI refresh.' },
    { id: 2, title: isAr ? 'تمت أرشفة 50 عينة' : 'Archived 50 samples', time: '5h ago', type: 'data', desc: 'Automatic archival of finished samples.' },
    { id: 3, title: isAr ? 'صيانة مجدولة' : 'Scheduled Maintenance', time: '1d ago', type: 'alert', desc: 'Server maintenance scheduled for Friday.' },
  ];

  // --- Active Hold Cases (for Table) ---
  const activeHoldCases = useMemo(() => {
    return holdCases
      .filter(c => !c.is_finished)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [holdCases]);

  return (
    <div className="p-6 md:p-8 space-y-8 min-h-full animate-in fade-in duration-500">
      
      {/* Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-sm group min-h-[180px] flex items-center bg-slate-900 border border-slate-800">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-10 transition-transform duration-[30s] ease-out group-hover:scale-105"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1579165466741-7f35a4755657?q=80&w=2560&auto=format&fit=crop')` }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-900 via-slate-900/95 to-transparent"></div>
        
        <div className="relative z-10 w-full p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
             <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded-full bg-cyan-900/50 border border-cyan-800 text-cyan-100 text-[10px] font-black uppercase tracking-widest">
                  {isAr ? 'نظام المختبر الذكي' : 'Smart Lab System'}
                </span>
                <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                <span className="text-[10px] font-bold text-cyan-100 uppercase tracking-wider">v2.9.6</span>
             </div>
             <h1 className="text-3xl md:text-4xl font-black mb-1 tracking-tight leading-tight">
               {isAr ? 'مرحباً بك، ' : 'Welcome back, '}
               <span className="text-cyan-400">
                 {currentUser?.name || 'Admin'}
               </span>
             </h1>
             <p className="text-slate-300 text-sm font-medium leading-relaxed max-w-lg">
               {isAr 
                 ? 'لديك نظرة عامة على جميع العمليات الحيوية اليوم. تحقق من التنبيهات والحالات المعلقة.' 
                 : 'You have an overview of all vital operations today. Check alerts and pending cases.'}
             </p>
          </div>
          
          <div className="hidden lg:flex items-center gap-4 bg-slate-800/50 p-4 rounded-[2rem] border border-slate-700 shadow-sm">
             <div className="bg-slate-900 p-3 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-slate-700">
               <ICONS.Activity 
                 className="w-6 h-6 text-cyan-400" 
                 style={{ filter: 'drop-shadow(0 0 5px #00E5FF)' }}
               />
             </div>
             <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{isAr ? 'حالة النظام' : 'System Status'}</p>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                 <p className="text-sm font-black text-white tracking-tight">{isAr ? 'نشط ومستقر' : 'Active & Stable'}</p>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* 1. KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {kpiData.map((kpi) => (
          <div key={kpi.id} className="bg-white rounded-[2rem] p-7 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group cursor-default border border-cyan-100 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${kpi.bg.replace('/10', '-50')} ${kpi.text.replace('-40', '-60')} group-hover:scale-110 transition-transform duration-500 shadow-sm border border-current/10`}>
                <kpi.icon 
                  className="w-7 h-7 text-black" 
                  style={{ filter: 'invert(66%) sepia(90%) saturate(2500%) hue-rotate(145deg) brightness(105%) contrast(105%) drop-shadow(0 0 10px #00E5FF)' }}
                />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-full border ${kpi.trendUp ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                {kpi.trendUp ? <ICONS.TrendingUp className="w-3.5 h-3.5" /> : <ICONS.TrendingDown className="w-3.5 h-3.5" />}
                <span>{kpi.trend}</span>
              </div>
            </div>
            <div>
              <h3 className="text-4xl font-black text-black tracking-tighter mb-2">{kpi.value}</h3>
              <p className="text-xs font-black text-black uppercase tracking-[0.2em] mb-1">{kpi.label}</p>
              <p className="text-[10px] font-bold text-black">{kpi.subValue}</p>
            </div>
            {/* Mini Sparkline Mock (Visual only) */}
            <div className="mt-6 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
               <div className={`h-full bg-cyan-600 rounded-full transition-all duration-1000 group-hover:w-full`} style={{ width: '60%' }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-black text-black tracking-tight">{isAr ? 'النشاط الأسبوعي' : 'Weekly Throughput'}</h3>
              <p className="text-sm text-black mt-1 font-bold">{isAr ? 'عدد العينات المسجلة خلال الأسبوع الماضي' : 'Samples registered over the last 7 days'}</p>
            </div>
            <button className="p-3 hover:bg-slate-50 rounded-2xl text-black hover:text-black transition-all">
              <ICONS.MoreHorizontal className="w-6 h-6" />
            </button>
          </div>
          <div className="h-[350px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.weeklyData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#000000', fontSize: 11, fontWeight: 800}} 
                  dy={15} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#000000', fontSize: 11, fontWeight: 800}} 
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#06b6d4', fontWeight: 900 }}
                  cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#06b6d4" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  activeDot={{ r: 8, strokeWidth: 0, fill: '#06b6d4' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-xl font-black text-black tracking-tight">{isAr ? 'توزيع أنواع العينات' : 'Sample Types'}</h3>
            <p className="text-sm text-black mt-1 font-bold">{isAr ? 'نسبة كل نوع من إجمالي العينات' : 'Distribution by sample type'}</p>
          </div>
          <div className="flex-1 min-h-[300px] w-full relative" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={105}
                  paddingAngle={6}
                  dataKey="value"
                  cornerRadius={10}
                >
                  {chartData.donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} stroke="#fff" />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '15px', border: '1px solid #f1f5f9' }} />
                <Legend 
                  verticalAlign="bottom" 
                  height={40} 
                  iconType="circle" 
                  iconSize={10}
                  wrapperStyle={{ fontSize: '12px', fontWeight: 800, color: '#000000', paddingTop: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-12">
               <div className="text-center">
                 <span className="block text-4xl font-black text-black tracking-tighter">{samples.length}</span>
                 <span className="text-[10px] text-black font-black uppercase tracking-[0.3em]">Total</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Detailed Holds Log Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-black flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <ICONS.AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              {isAr ? 'سجل الحالات المعلقة' : 'Detailed Holds Log'}
            </h3>
            <p className="text-sm text-black mt-1 font-bold">{isAr ? 'قائمة بجميع الحالات التي تتطلب مراجعة' : 'List of all cases requiring review'}</p>
          </div>
          <div className="flex gap-3">
             <button 
               onClick={() => reportService.exportHoldToExcel(activeHoldCases, users, 'Active_Holds_Report')}
               className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-black hover:bg-slate-50 hover:text-black transition-all shadow-sm"
             >
               {isAr ? 'تصدير' : 'Export'}
             </button>
             <button 
               onClick={() => setView('hold-cases')}
               className="px-6 py-3 bg-cyan-600 text-white rounded-2xl text-xs font-black hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-100"
             >
               {isAr ? 'عرض الكل' : 'View All'}
             </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${isAr ? 'text-right' : 'text-left'}`}>
            <thead className="bg-slate-50 text-black font-black uppercase text-[10px] tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">{isAr ? 'رقم العينة' : 'Sample ID'}</th>
                <th className="px-8 py-5">{isAr ? 'المريض' : 'Patient'}</th>
                <th className="px-8 py-5">{isAr ? 'السبب' : 'Reason'}</th>
                <th className="px-8 py-5">{isAr ? 'التاريخ' : 'Date'}</th>
                <th className="px-8 py-5">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="px-8 py-5 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeHoldCases.length > 0 ? (
                activeHoldCases.map((hold) => (
                  <tr key={hold.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-5 font-mono font-black text-black text-xs">{hold.patient_id}</td>
                    <td className="px-8 py-5 font-black text-black">{hold.patient_name}</td>
                    <td className="px-8 py-5 text-black max-w-xs truncate text-xs font-bold">{hold.comment}</td>
                    <td className="px-8 py-5 text-black font-mono text-[10px] font-black">{new Date(hold.created_at).toLocaleDateString()}</td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                        hold.status === HoldFileStatus.FINISHED 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {hold.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => onNavigate('register-pending-cases')}
                        className="p-3 text-black hover:text-black hover:bg-cyan-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title={isAr ? 'تعديل الحالة' : 'Edit Case'}
                      >
                        <ICONS.Edit2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-black">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                        <ICONS.CheckCircle className="w-8 h-8 text-black" />
                      </div>
                      <p className="font-black text-base tracking-tight">{isAr ? 'لا توجد حالات معلقة' : 'No active holds'}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Updates & Logs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Updates Timeline */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-black mb-8 tracking-tight">{isAr ? 'آخر التحديثات' : 'Recent Updates'}</h3>
          <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-3 before:w-0.5 before:bg-slate-100 pl-1">
             {recentUpdates.map((update) => (
               <div key={update.id} className="relative flex items-start gap-5 pl-3">
                 <div className={`relative z-10 w-6 h-6 rounded-full border-4 border-white shadow-sm flex-shrink-0 flex items-center justify-center ${
                   update.type === 'system' ? 'bg-cyan-500' : update.type === 'data' ? 'bg-emerald-500' : 'bg-amber-500'
                 }`}>
                 </div>
                 <div>
                   <p className="text-base font-black text-black">{update.title}</p>
                   <p className="text-[10px] text-black mt-1 font-black uppercase tracking-widest">{update.time}</p>
                   <p className="text-xs text-black mt-2 leading-relaxed font-bold">{update.desc}</p>
                 </div>
               </div>
             ))}
          </div>
          <button className="w-full mt-10 py-4 text-xs font-black text-black bg-cyan-50 hover:bg-cyan-100 rounded-2xl transition-all uppercase tracking-[0.2em] border border-cyan-100">
            {isAr ? 'عرض سجل النظام' : 'View System Log'}
          </button>
        </div>

        {/* Patient Samples Log Preview */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-black tracking-tight">{isAr ? 'سجل عينات المرضى' : 'Patient Samples Log'}</h3>
            <button 
              onClick={() => onNavigate('inventory')}
              className="text-xs font-black text-black hover:text-black uppercase tracking-[0.2em] transition-colors"
            >
              {isAr ? 'عرض الكل' : 'View All'}
            </button>
          </div>
          <div className="space-y-4 flex-1">
             {samples.slice(0, 5).map((sample, idx) => (
               <div key={idx} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group cursor-pointer">
                 <div className="flex items-center gap-5">
                   <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-black font-black text-xs group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-sm">
                     {sample.tube_type ? sample.tube_type.substring(0, 2).toUpperCase() : 'NA'}
                   </div>
                   <div>
                     <p className="text-base font-black text-black group-hover:text-cyan-600 transition-colors">{sample.patient_name}</p>
                     <p className="text-[10px] text-black font-mono font-black tracking-widest">{sample.patient_id}</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-black text-black/60">{new Date(sample.created_at).toLocaleDateString()}</p>
                   <span className="text-[10px] text-cyan-600/60 font-black uppercase tracking-widest">{sample.created_by || 'System'}</span>
                 </div>
               </div>
             ))}
             {samples.length === 0 && (
               <div className="text-center py-16 text-black text-sm font-black uppercase tracking-widest">
                 {isAr ? 'لا توجد عينات مسجلة' : 'No samples found'}
               </div>
             )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default HomeOverview;
