
import React, { useState } from 'react';
import { HoldCase, User, HoldFileStatus } from '../types';
import { ICONS } from '../constants';

interface PendingCasesRegistryProps {
  lang: 'ar' | 'en';
  holdCases: HoldCase[];
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onUndoComplete: (id: string) => void;
  currentUser: User;
}

const PendingCasesRegistry: React.FC<PendingCasesRegistryProps> = ({ lang, holdCases, onDelete, onComplete, onUndoComplete }) => {
  const isAr = lang === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleComplete = async (id: string) => {
    setProcessingId(id);
    setTimeout(() => {
      onComplete(id);
      setProcessingId(null);
    }, 600);
  };

  const handleUndoComplete = async (id: string) => {
    setProcessingId(id);
    setTimeout(() => {
      onUndoComplete(id);
      setProcessingId(null);
    }, 600);
  };

  const getWaitingDuration = (item: HoldCase) => {
    const startDate = new Date(item.created_at);
    const endDate = item.finished_at ? new Date(item.finished_at) : new Date();
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return isAr ? '< 1 يوم' : '< 1 Day';
    }
    return isAr ? `${diffDays} يوم` : `${diffDays} Days`;
  };

  const filteredCases = holdCases.filter(c => 
    c.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.center_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.test_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 font-['Cairo']">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        {/* Header Section */}
        <div className="px-10 py-8 border-b border-slate-50 flex flex-col md:flex-row items-center justify-between bg-slate-50/30 gap-6">
          <div>
            <h3 className="font-black text-black text-xl flex items-center gap-3">
              <ICONS.Register className="w-6 h-6 text-blue-500" />
              {isAr ? 'سجل الحالات المعلقة التفصيلي' : 'Detailed Pending Cases Registry'}
            </h3>
            <p className="text-xs text-black font-bold uppercase tracking-widest mt-1">Medical Follow-up Registry</p>
          </div>
          
          <div className="relative w-full md:w-96">
            <ICONS.Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
            <input 
              id="searchPendingCases"
              type="text"
              placeholder={isAr ? 'بحث بالاسم، الكود، المركز أو التحليل...' : 'Search by name, ID, center or test...'}
              aria-label={isAr ? 'بحث في الحالات المعلقة' : 'Search pending cases'}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 pr-11 pl-4 text-sm font-bold text-black focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Table Section */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-white text-xs font-black text-black uppercase tracking-widest border-b">
                <th className="px-6 py-6 border-l border-slate-50">{isAr ? 'اسم المريض' : 'Patient Name'}</th>
                <th className="px-6 py-6 border-l border-slate-50">{isAr ? 'الكود' : 'Code'}</th>
                <th className="px-6 py-6 border-l border-slate-50">{isAr ? 'اسم التحليل' : 'Test Name'}</th>
                <th className="px-6 py-6 border-l border-slate-50">{isAr ? 'اسم المركز' : 'Center Name'}</th>
                <th className="px-6 py-6 border-l border-slate-50">{isAr ? 'المستخدم' : 'User'}</th>
                <th className="px-6 py-6 border-l border-slate-50">{isAr ? 'السبب' : 'Reason'}</th>
                <th className="px-6 py-6 border-l border-slate-50">{isAr ? 'حالة الملف' : 'File Status'}</th>
                <th className="px-6 py-6 border-l border-slate-50">{isAr ? 'الملاحظات' : 'Notes'}</th>
                <th className="px-6 py-6 border-l border-slate-50">{isAr ? 'التاريخ' : 'Date'}</th>
                <th className="px-6 py-6 text-center">{isAr ? 'العمليات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCases.map(item => {
                const isItemFinished = item.is_finished || item.status === HoldFileStatus.FINISHED;
                const duration = getWaitingDuration(item);
                return (
                  <tr key={item.id} className={`transition-all group ${isItemFinished ? 'bg-emerald-50/20 grayscale-[0.3]' : 'hover:bg-blue-50/10'}`}>
                    <td className="px-6 py-5">
                      <span className={`font-black text-base ${isItemFinished ? 'text-black' : 'text-black'}`}>
                        {item.patient_name}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100/50">
                        {item.patient_id}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-bold text-black">
                        {item.test_type}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-bold text-black">
                        {item.center_name}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-black text-black bg-slate-100 px-2 py-1 rounded-md">
                        {item.created_by || (isAr ? 'غير معروف' : 'Unknown')}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-black border bg-white border-slate-200 text-black whitespace-nowrap`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className={`border px-3 py-1.5 rounded-xl text-xs font-black shadow-sm inline-block whitespace-nowrap text-center ${isItemFinished ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-amber-100 border-amber-200 text-amber-700'}`}>
                          {isItemFinished ? (isAr ? 'منتهي' : 'Finished') : (isAr ? 'قيد الانتظار' : 'Pending')}
                        </span>
                        <div className="flex items-center justify-center gap-1.5 opacity-80">
                           <ICONS.Activity className="w-3 h-3 text-black" />
                           <span className="text-[11px] font-black text-black whitespace-nowrap">
                             {isAr ? 'المدة:' : 'Time:'} {duration}
                           </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 max-w-xs">
                      <p className="text-sm text-black font-medium truncate group-hover:whitespace-normal transition-all" title={item.comment}>
                        {item.comment || (isAr ? 'لا يوجد' : 'N/A')}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-black text-xs whitespace-nowrap">
                           {isAr ? 'دخول: ' : 'In: '} {new Date(item.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                        </span>
                        {isItemFinished && item.finished_at && (
                          <span className="font-bold text-emerald-600 text-xs whitespace-nowrap">
                            {isAr ? 'خروج: ' : 'Out: '} {new Date(item.finished_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          type="button"
                          onClick={() => isItemFinished ? handleUndoComplete(item.id) : handleComplete(item.id)}
                          disabled={processingId === item.id}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap ${isItemFinished ? 'bg-amber-100 border border-amber-200' : (processingId === item.id ? 'bg-emerald-800' : 'bg-emerald-600 hover:bg-emerald-700')}`}
                        >
                          {processingId === item.id ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <ICONS.CheckCircle className={`w-4 h-4 ${isItemFinished ? 'text-amber-500' : 'text-white'}`} />
                          )}
                          <span className={`text-xs font-black uppercase tracking-wider ${isItemFinished ? 'text-amber-700' : 'text-white'}`}>
                            {isItemFinished ? (isAr ? 'تراجع' : 'Undo') : (isAr ? 'إنجاز' : 'Finish')}
                          </span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => onDelete(item.id)}
                          className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-100"
                          title={isAr ? 'حذف' : 'Delete'}
                        >
                          <ICONS.Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredCases.length === 0 && (
            <div className="py-32 text-center bg-slate-50/10">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                <ICONS.Search className="w-6 h-6 text-black" />
              </div>
              <p className="text-black font-black italic text-sm">
                {isAr ? 'لم يتم العثور على سجلات تطابق بحثك' : 'No records found matching your search'}
              </p>
            </div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="px-10 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-xs font-black text-black uppercase tracking-[0.2em]">
          <span>Total: {filteredCases.length} Cases</span>
          <span>System Registry v2.9</span>
        </div>
      </div>
    </div>
  );
};

export default PendingCasesRegistry;
