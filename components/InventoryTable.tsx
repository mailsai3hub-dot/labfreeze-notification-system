import React, { useState, useMemo, useEffect } from 'react';
import { Sample, SampleStatus, User, UserRole, TubeType } from '../types';
import { ICONS, STATUS_CLASSES } from '../constants';
import { reportService } from '../services/reportService';

interface InventoryTableProps {
  samples: Sample[];
  lang: 'ar' | 'en';
  onDelete: (id: string) => void;
  onEdit: (sample: Sample) => void;
  onMarkFinished: (id: string) => void;
  currentUser: User;
  users: User[]; // Added
  filter: string;
  onFilterChange: (filter: string) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ 
  samples, 
  lang, 
  onDelete, 
  onEdit,
  onMarkFinished, 
  currentUser,
  users, // Added
  filter,
  onFilterChange
}) => {
  const isAr = lang === 'ar';
  const isAdmin = currentUser.role === UserRole.ADMIN;

  // --- Advanced Filter State ---
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<SampleStatus[]>([]);
  const [selectedTube, setSelectedTube] = useState<string>('All');
  const [dateRange, setDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });

  useEffect(() => {
    if (filter && filter !== 'All') {
      setSelectedStatuses([filter as SampleStatus]);
      setIsFilterExpanded(true);
    }
  }, [filter]);

  // --- Filtering Logic ---
  const filtered = useMemo(() => {
    return samples.filter(sample => {
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(sample.status)) {
        return false;
      }
      if (selectedTube !== 'All' && sample.tube_type !== selectedTube) {
        return false;
      }
      if (dateRange.start) {
        const start = new Date(dateRange.start);
        start.setHours(0, 0, 0, 0);
        if (new Date(sample.created_at) < start) return false;
      }
      if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        if (new Date(sample.created_at) > end) return false;
      }
      return true;
    });
  }, [samples, selectedStatuses, selectedTube, dateRange]);

  const toggleStatus = (status: SampleStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSelectedStatuses([]);
    setSelectedTube('All');
    setDateRange({ start: '', end: '' });
    onFilterChange('All');
  };

  const activeFiltersCount = 
    selectedStatuses.length + 
    (selectedTube !== 'All' ? 1 : 0) + 
    (dateRange.start ? 1 : 0) + 
    (dateRange.end ? 1 : 0);

  const statusTranslations: Record<string, string> = {
    [SampleStatus.HOLD]: isAr ? 'انتظار (Hold)' : 'Hold',
    [SampleStatus.TAREK]: 'Tarek',
    [SampleStatus.CD]: 'CD',
    [SampleStatus.PAYMENT]: isAr ? 'دفع (Payment)' : 'Payment',
    [SampleStatus.SAVING]: isAr ? 'حفظ (Saving)' : 'Saving Sample',
    [SampleStatus.SETUP]: 'Setup',
    [SampleStatus.FINISHED]: isAr ? 'منتهية (Finished)' : 'Finished'
  };

  const headers = [
    isAr ? 'الاسم الكامل' : 'Full Name',
    isAr ? 'كود المريض' : 'Patient ID',
    isAr ? 'نوع العينة' : 'Tube Type',
    isAr ? 'العدد' : 'Count',
    isAr ? 'الحالة الحالية' : 'Current Status',
    isAr ? 'الملاحظات' : 'Notes',
    isAr ? 'تاريخ الإدخال' : 'Entry Date',
    isAr ? 'الحالة النهائية' : 'Final State',
    isAr ? 'العمليات' : 'Actions',
    ...(isAdmin ? ['User'] : []), // Changed to always 'User'
  ];

  const handleExportExcel = () => {
    const fileName = selectedStatuses.length === 1 ? `Inventory_${selectedStatuses[0]}` : 'Inventory_Filtered';
    reportService.exportInventoryToExcel(filtered, users, fileName);
  };

  const handleExportPDF = () => {
    const title = isAr ? 'سجل جرد العينات' : 'Samples Inventory Report';
    reportService.exportInventoryToPDF(filtered, users, title);
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 overflow-hidden font-['Cairo'] animate-in fade-in slide-in-from-bottom-8 duration-700 relative">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none"></div>

      {/* Header Section */}
      <div className="relative z-10 p-8 border-b border-white/40 bg-white/50 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-black text-black text-xl flex items-center gap-3 tracking-tight">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                 <ICONS.Filter className="w-6 h-6" />
              </div>
              {isAr ? 'سجل جرد العينات' : 'Samples Inventory'}
            </h3>
            <p className="text-sm text-black mt-2 font-bold">
              {isAr ? 'عرض وإدارة كافة العينات المسجلة في النظام' : 'Manage and track all lab samples'}
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`flex-1 md:flex-none px-6 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all border ${isFilterExpanded || activeFiltersCount > 0 ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-white/80 text-black border-slate-200/60 hover:bg-white shadow-sm'}`}
            >
              <ICONS.Filter className="w-4 h-4" />
              <span>{isAr ? 'تصفية متقدمة' : 'Filters'}</span>
              {activeFiltersCount > 0 && (
                <span className="bg-blue-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center ml-1 shadow-sm">
                  {activeFiltersCount}
                </span>
              )}
              {isFilterExpanded ? <ICONS.ChevronUp className="w-4 h-4" /> : <ICONS.ChevronDown className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleExportExcel}
                className="bg-emerald-50/80 backdrop-blur-sm text-emerald-600 border border-emerald-200/60 p-3.5 rounded-2xl hover:bg-emerald-100 transition-all shadow-sm active:scale-95 group"
                title="Excel Export"
              >
                <ICONS.Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
              <button 
                onClick={handleExportPDF}
                className="bg-rose-50/80 backdrop-blur-sm text-rose-600 border border-rose-200/60 p-3.5 rounded-2xl hover:bg-rose-100 transition-all shadow-sm active:scale-95 group"
                title="PDF Export"
              >
                <ICONS.FileText className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isFilterExpanded ? 'max-h-[500px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
           <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-inner grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="lg:col-span-12">
                 <label className="text-[10px] font-black text-black uppercase tracking-widest mb-3 block flex items-center gap-2">
                   <ICONS.Activity className="w-3 h-3" />
                   {isAr ? 'تصفية حسب الحالة (متعدد)' : 'Filter by Status (Multi-select)'}
                 </label>
                 <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => setSelectedStatuses([])}
                      className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${selectedStatuses.length === 0 ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white/80 text-black border-slate-200/60 hover:border-slate-300 shadow-sm'}`}
                    >
                      {isAr ? 'الكل' : 'All'}
                    </button>
                    {Object.values(SampleStatus).map(status => (
                      <button
                        key={status}
                        onClick={() => toggleStatus(status)}
                        className={`px-4 py-2 rounded-xl text-xs font-black border flex items-center gap-2 transition-all ${selectedStatuses.includes(status) ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' : 'bg-white/80 text-black border-slate-200/60 hover:border-blue-300 shadow-sm'}`}
                      >
                         {selectedStatuses.includes(status) && <ICONS.Check className="w-3 h-3" />}
                         {statusTranslations[status] || status}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="lg:col-span-4">
                 <label htmlFor="tubeTypeFilter" className="text-[10px] font-black text-black uppercase tracking-widest mb-2 block flex items-center gap-2">
                   <ICONS.Disc className="w-3 h-3" />
                   {isAr ? 'نوع الأنبوب' : 'Tube Type'}
                 </label>
                 <div className="relative">
                    <select 
                      id="tubeTypeFilter"
                      value={selectedTube}
                      onChange={(e) => setSelectedTube(e.target.value)}
                      className="w-full bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400/50 appearance-none cursor-pointer shadow-sm transition-all"
                    >
                      <option value="All">{isAr ? 'جميع الأنواع' : 'All Types'}</option>
                      {Object.values(TubeType).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <ICONS.ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
                 </div>
              </div>

              <div className="lg:col-span-6 grid grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="fromDate" className="text-[10px] font-black text-black uppercase tracking-widest mb-2 block flex items-center gap-2">
                      <ICONS.Calendar className="w-3 h-3" />
                      {isAr ? 'من تاريخ' : 'From Date'}
                    </label>
                    <div className="relative">
                       <input 
                         id="fromDate"
                         type="date"
                         value={dateRange.start}
                         onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                         className="w-full bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400/50 shadow-sm transition-all"
                       />
                       <ICONS.Calendar className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none`} />
                    </div>
                 </div>
                 <div>
                    <label htmlFor="toDate" className="text-[10px] font-black text-black uppercase tracking-widest mb-2 block flex items-center gap-2">
                      <ICONS.Calendar className="w-3 h-3" />
                      {isAr ? 'إلى تاريخ' : 'To Date'}
                    </label>
                    <div className="relative">
                       <input 
                         id="toDate"
                         type="date"
                         value={dateRange.end}
                         onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                         className="w-full bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400/50 shadow-sm transition-all"
                       />
                       <ICONS.Calendar className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none`} />
                    </div>
                 </div>
              </div>

              <div className="lg:col-span-2 flex items-end">
                 <button 
                   onClick={clearFilters}
                   className="w-full py-3 rounded-xl bg-slate-200/80 backdrop-blur-sm text-black font-black text-xs hover:bg-slate-300 transition-colors flex items-center justify-center gap-2 shadow-sm"
                 >
                    <ICONS.Refresh className="w-4 h-4" />
                    {isAr ? 'إعادة تعيين' : 'Reset'}
                 </button>
              </div>

           </div>
        </div>
      </div>

      <div className="relative z-10 overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50/50 backdrop-blur-sm border-b border-white/40">
              {headers.map((h, i) => (
                <th key={i} className="px-8 py-5 text-black font-black text-[11px] uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/50">
            {filtered.map((sample) => {
              const isFinished = sample.status === SampleStatus.FINISHED;
              return (
                <tr key={sample.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-8 py-5 font-black text-black whitespace-nowrap">{sample.patient_name}</td>
                  <td className="px-8 py-5 text-black font-mono text-xs font-bold whitespace-nowrap">{sample.patient_id}</td>
                  <td className="px-8 py-5">
                     <span className="text-black font-bold text-sm whitespace-nowrap">{sample.tube_type}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="bg-blue-50/80 backdrop-blur-sm text-blue-700 px-3 py-1 rounded-lg font-black text-xs border border-blue-200/60 shadow-sm">
                      {sample.count}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] uppercase font-black px-4 py-1.5 rounded-full shadow-sm border whitespace-nowrap backdrop-blur-sm ${STATUS_CLASSES[sample.status.split(' ')[0] as keyof typeof STATUS_CLASSES] || 'bg-slate-100/80 text-black border-slate-200/60'}`}>
                      {statusTranslations[sample.status] || sample.status}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs text-black font-medium max-w-[150px] truncate" title={sample.notes}>
                      {sample.notes || (isAr ? 'لا يوجد' : 'N/A')}
                    </p>
                  </td>
                  <td className="px-8 py-5 text-black text-xs font-bold whitespace-nowrap">
                    {new Date(sample.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'medium' })}
                  </td>
                  
                  <td className="px-8 py-5">
                    <div className="flex flex-col items-center justify-center gap-2 min-w-[100px]">
                      {isFinished ? (
                        <div className="flex flex-col items-center gap-1 animate-in zoom-in duration-700">
                           <ICONS.CheckCircle className="w-10 h-10 text-emerald-500 drop-shadow-lg" strokeWidth={3} />
                           <span className="text-[10px] font-black text-emerald-700 bg-emerald-50/80 backdrop-blur-sm px-3 py-0.5 rounded-full border border-emerald-200/60 uppercase tracking-tighter whitespace-nowrap shadow-sm">
                             {isAr ? 'تم الإنجاز' : 'Finished'}
                           </span>
                           {(sample.finished_at || sample.created_at) && (
                             <span className="text-[9px] font-bold text-black mt-1">
                               {new Date(sample.finished_at || sample.created_at).toLocaleDateString('en-GB')}
                             </span>
                           )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 opacity-40">
                          <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                             <div className="w-2 h-2 bg-slate-300 rounded-full animate-pulse"></div>
                          </div>
                          <span className="text-[9px] font-black text-black uppercase tracking-widest whitespace-nowrap">
                            {isAr ? 'قيد المتابعة' : 'Pending'}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-8 py-5">
                    <div className="flex gap-4 justify-center items-center">
                      {!isFinished ? (
                        <button 
                          onClick={() => onMarkFinished(sample.id)}
                          className="group/finish relative bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-5 rounded-2xl shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500 hover:scale-110 active:scale-95 transition-all flex flex-col items-center gap-1 border border-emerald-400/30 overflow-hidden" 
                          title={isAr ? 'تأكيد إنجاز الحالة' : 'Confirm Case Finished'}
                        >
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/finish:translate-y-0 transition-transform duration-300 ease-out"></div>
                          <ICONS.CheckCircle className="w-8 h-8 group-hover/finish:rotate-12 transition-transform relative z-10" />
                          <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap relative z-10">{isAr ? 'إنجاز' : 'Done'}</span>
                        </button>
                      ) : (
                         <div className="p-4 bg-emerald-50/50 backdrop-blur-sm text-emerald-300 rounded-2xl border border-emerald-100/50 opacity-50">
                            <ICONS.CheckCircle className="w-7 h-7" />
                         </div>
                      )}
                      
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => reportService.printSampleLabel(sample)} 
                          className="p-2 text-indigo-600 hover:bg-indigo-50/80 backdrop-blur-sm rounded-xl transition-colors shadow-sm border border-transparent hover:border-indigo-100" 
                          title={isAr ? 'طباعة ملصق (Sticker)' : 'Print Label'}
                        >
                          <ICONS.Printer className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(sample);
                          }} 
                          className="p-2 text-blue-600 hover:bg-blue-50/80 backdrop-blur-sm rounded-xl transition-colors shadow-sm border border-transparent hover:border-blue-100"
                          title={isAr ? 'تعديل' : 'Edit'}
                        >
                          <ICONS.Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDelete(sample.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50/80 backdrop-blur-sm rounded-xl transition-colors shadow-sm border border-transparent hover:border-rose-100"
                          title={isAr ? 'حذف' : 'Delete'}
                        >
                          <ICONS.Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </td>

                  {isAdmin && (
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-[10px] font-black text-white shadow-md shadow-blue-500/20 border border-blue-400/30">
                          {(sample.created_by || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-black text-black whitespace-nowrap">{sample.created_by || (isAr ? 'غير معروف' : 'Unknown')}</span>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filtered.length === 0 && (
          <div className="text-center py-32 bg-slate-50/10 backdrop-blur-sm">
            <div className="w-20 h-20 bg-slate-100/50 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50 shadow-inner">
               <ICONS.Search className="w-8 h-8 text-black" />
            </div>
            <p className="text-black font-bold italic">
              {isAr ? 'لا توجد سجلات مطابقة لهذا البحث' : 'No records found matching your criteria'}
            </p>
          </div>
        )}
      </div>

      <div className="relative z-10 p-6 border-t border-white/40 bg-white/50 backdrop-blur-sm flex items-center justify-between text-xs font-black text-black uppercase tracking-widest">
        <p>{isAr ? 'إجمالي السجلات:' : 'Total Records:'} {filtered.length} {isAr ? 'عينة' : 'Samples'}</p>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-xl border border-slate-200/60 bg-white/50 hover:bg-white shadow-sm transition-all text-black">1</button>
          <button className="px-4 py-2 rounded-xl border border-slate-200/60 bg-white/50 hover:bg-white shadow-sm transition-all text-black">2</button>
        </div>
      </div>
    </div>
  );
};

export default InventoryTable;
