import React, { useMemo } from 'react';
import { Sample, SampleStatus, User } from '../types';
import { ICONS } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { reportService } from '../services/reportService';
import NotificationCenter from '../components/NotificationCenter';
interface DashboardProps {
  samples: Sample[];
  lang: 'ar' | 'en';
  currentUser: User;
  users: User[]; // Added
  totalCapacity?: number; // Added Prop for dynamic capacity
}

const Dashboard: React.FC<DashboardProps> = ({ samples, lang, users, totalCapacity = 5000 }) => {
  const isAr = lang === 'ar';
  // const isAdmin = currentUser.role === UserRole.ADMIN;

  const currentUsage = samples.length;
  const usagePercentage = Math.round((currentUsage / totalCapacity) * 100);

  const stats = [
    { 
      label: isAr ? 'إجمالي العينات' : 'Total Samples', 
      value: currentUsage, 
      icon: ICONS.LayoutDashboard, 
      color: 'bg-navy',
      accent: 'text-teal'
    },
    { 
      label: isAr ? 'قيد الانتظار' : 'Hold', 
      value: samples.filter(s => s.status === SampleStatus.HOLD).length, 
      icon: ICONS.Filter, 
      color: 'bg-teal',
      accent: 'text-navy'
    },
    { 
      label: isAr ? 'بانتظار الدفع' : 'Payment', 
      value: samples.filter(s => s.status === SampleStatus.PAYMENT).length, 
      icon: ICONS.Plus, 
      color: 'bg-rose-500',
      accent: 'text-white'
    },
    { 
      label: isAr ? 'حالات منتهية' : 'Finished', 
      value: samples.filter(s => s.status === SampleStatus.FINISHED).length, 
      icon: ICONS.CheckCircle, 
      color: 'bg-teal-light',
      accent: 'text-navy'
    },
    { 
      label: isAr ? 'المساحة' : 'Space', 
      value: `${usagePercentage}%`, 
      icon: ICONS.Search, 
      color: 'bg-navy-light',
      accent: 'text-teal'
    },
  ];

  // Status Distribution (Existing)
  const chartData = Object.values(SampleStatus).map(status => ({
    name: status,
    value: samples.filter(s => s.status === status).length,
    color: status === SampleStatus.HOLD ? '#2bb69a' : (status === SampleStatus.FINISHED ? '#1e3a8a' : '#cbd5e1')
  })).filter(d => d.value > 0);

  // Tube Type Distribution (New Donut Chart)
  const typeChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    samples.forEach(s => {
      counts[s.tube_type] = (counts[s.tube_type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [samples]);

  const COLORS_PIE = ['#1e3a8a', '#2bb69a', '#3b82f6', '#60a5fa', '#93c5fd', '#cbd5e1'];

  const handleExportExcel = () => {
    reportService.exportInventoryToExcel(samples, users, isAr ? 'تقرير_المعمل_الشامل' : 'Lab_Comprehensive_Report');
  };

  const handleExportPDF = () => {
    reportService.exportInventoryToPDF(samples, users, isAr ? 'سجل جرد العينات المجمدة' : 'Frozen Samples Inventory Report');
  };

  const handleFinishedReport = () => {
    const finished = samples.filter(s => s.status === SampleStatus.FINISHED);
    if (finished.length === 0) {
      alert(isAr ? 'لا توجد حالات منتهية لعمل تقرير' : 'No finished cases to generate report');
      return;
    }
    reportService.exportInventoryToPDF(finished, users, isAr ? 'تقرير الحالات المنتهية' : 'Finished Cases Report');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 font-['Cairo']" dir="rtl">
      {/* KPI Grid - Responsive: 2 cols on mobile (gap-3), 5 on large screens */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col items-center justify-center gap-4 hover:shadow-xl hover:-translate-y-2 transition-all duration-500 text-center group relative overflow-hidden shadow-sm"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${stat.color}`}></div>
            <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 border border-white/20`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-black leading-none tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
      <NotificationCenter />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Status Distribution Chart */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[40px] border border-slate-100 hover:shadow-xl transition-all duration-500 shadow-sm">
          <h3 className="text-xl font-black text-black mb-8 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
               <ICONS.LayoutDashboard className="w-6 h-6" />
            </div>
            {isAr ? 'حالات العينات' : 'Sample Status'}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '20px', 
                    border: '1px solid #f1f5f9', 
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', 
                    padding: '16px',
                  }} 
                  itemStyle={{ fontWeight: '900', fontSize: '14px', color: '#000' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '900', paddingTop: '30px', color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* NEW: Tube Type Donut Chart */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[40px] border border-slate-100 hover:shadow-xl transition-all duration-500 shadow-sm">
          <h3 className="text-xl font-black text-black mb-8 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
               <ICONS.Disc className="w-6 h-6" />
            </div>
            {isAr ? 'توزيع أنواع العينات' : 'Sample Types'}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {typeChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '20px', 
                    border: '1px solid #f1f5f9', 
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', 
                    padding: '16px',
                  }} 
                  itemStyle={{ fontWeight: '900', fontSize: '14px', color: '#000' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '900', paddingTop: '30px', color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[40px] border border-slate-100 hover:shadow-xl transition-all duration-500 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-black flex items-center gap-3">
               <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
                  <ICONS.Activity className="w-6 h-6" />
               </div>
               {isAr ? 'آخر النشاطات' : 'Recent Activity'}
            </h3>
            <button className="text-[10px] text-blue-600 font-black hover:bg-blue-50 px-4 py-2 rounded-xl transition-all uppercase tracking-[0.2em] border border-blue-100">
              {isAr ? 'عرض الكل' : 'View All'}
            </button>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {samples.slice(0, 5).map((sample) => (
              <div key={sample.id} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-[24px] border border-slate-100 transition-all group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-12 rounded-full shadow-sm`} style={{ backgroundColor: sample.status === SampleStatus.HOLD ? '#2bb69a' : (sample.status === SampleStatus.FINISHED ? '#1e3a8a' : '#cbd5e1') }}></div>
                  <div className="overflow-hidden">
                    <p className="font-black text-black truncate w-32 text-base group-hover:text-blue-600 transition-colors leading-tight">{sample.patient_name}</p>
                    <p className="text-[10px] text-black truncate w-32 font-mono mt-1 tracking-wider">
                      {sample.patient_id}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-black px-3 py-1.5 bg-white rounded-xl text-black border border-slate-100 inline-block shadow-sm`}>
                    {sample.status}
                  </span>
                  <p className="text-[9px] text-black font-black mt-1.5 uppercase tracking-widest">{sample.created_by}</p>
                </div>
              </div>
            ))}
            {samples.length === 0 && (
              <div className="text-center py-16 text-black italic font-bold">
                {isAr ? 'لا توجد بيانات متاحة حالياً' : 'No activity records found'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-600 rounded-[48px] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-xl shadow-blue-100 relative overflow-hidden group">
        <div className="relative z-10 flex flex-col gap-3 text-center md:text-right md:items-start items-center">
          <div className="flex items-center gap-4 mb-2">
             <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-xl border border-white/10 shadow-inner">
                <ICONS.FileText className="w-8 h-8 text-white" />
             </div>
             <h2 className="text-3xl font-black tracking-tight">{isAr ? 'التقارير الذكية' : 'Smart Reports'}</h2>
          </div>
          <p className="text-white/80 text-base max-w-md font-bold leading-relaxed">{isAr ? 'يمكنك استخراج تقرير كامل بجميع العينات أو تصفية الحالات المنتهية فقط بضغطة زر' : 'Generate complete inventory audits or filter only finished cases with a single click'}</p>
        </div>
        
        <div className="flex flex-wrap gap-5 relative z-10 justify-center">
          <button 
            onClick={handleFinishedReport}
            className="bg-white text-blue-600 px-8 py-5 rounded-2xl font-black flex items-center gap-3 hover:bg-blue-50 transition-all shadow-lg active:scale-95"
          >
            <ICONS.CheckCircle className="w-6 h-6" />
            <span className="text-lg">{isAr ? 'تقرير الحالات المنتهية' : 'Finished Cases Report'}</span>
          </button>
          
          <div className="w-px h-16 bg-white/10 hidden md:block mx-2 self-center"></div>
          
          <button 
            onClick={handleExportExcel}
            className="bg-white/10 backdrop-blur-xl text-white px-8 py-5 rounded-2xl font-black flex items-center gap-3 hover:bg-white/20 transition-all border border-white/10 shadow-xl active:scale-95"
          >
            <ICONS.Download className="w-6 h-6 text-white" />
            <span className="text-lg">Excel</span>
          </button>
          <button 
            onClick={handleExportPDF}
            className="bg-white/10 backdrop-blur-xl text-white px-8 py-5 rounded-2xl font-black flex items-center gap-3 hover:bg-white/20 transition-all border border-white/10 shadow-xl active:scale-95"
          >
            <ICONS.Download className="w-6 h-6 text-white" />
            <span className="text-lg">PDF</span>
          </button>
        </div>
        
        {/* Decorative Background Blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] pointer-events-none group-hover:bg-white/10 transition-all duration-1000"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-[80px] pointer-events-none group-hover:bg-white/10 transition-all duration-1000"></div>
      </div>
    </div>
  );
};

export default Dashboard;