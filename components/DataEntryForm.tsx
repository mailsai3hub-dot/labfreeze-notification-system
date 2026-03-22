import React, { useState } from 'react';
import { SampleStatus, TubeType } from '../types';
import { ICONS } from '../constants';

interface DataEntryFormProps {
  lang: 'ar' | 'en';
  onSubmit: (sample: any) => void;
  onFinish?: () => void;
}

const DataEntryForm: React.FC<DataEntryFormProps> = ({ lang, onSubmit, onFinish }) => {
  const [formData, setFormData] = useState({
    patientName: '',
    patientId: '',
    tubeType: TubeType.SERUM,
    count: 1,
    status: SampleStatus.HOLD,
    notes: ''
  });

  // Updated status list for Stepper visualization
  const statusSteps = [
    { id: SampleStatus.HOLD, label: 'Hold', icon: ICONS.FileText },
    { id: SampleStatus.TAREK, label: 'Tarek', icon: ICONS.Users },
    { id: SampleStatus.CD, label: 'CD', icon: ICONS.Disc },
    { id: SampleStatus.PAYMENT, label: 'Payment', icon: ICONS.CreditCard },
    { id: SampleStatus.SAVING, label: 'Saving', icon: ICONS.Archive },
    { id: SampleStatus.SETUP, label: 'Setup', icon: ICONS.Settings },
  ];

  const handleSubmit = (e: React.FormEvent, stayOnPage: boolean) => {
    e.preventDefault();
    if (!formData.patientName || !formData.patientId) {
      alert(lang === 'ar' ? 'يرجى إكمال البيانات الأساسية' : 'Please complete basic info');
      return;
    }
    onSubmit(formData);
    
    // Reset Form
    setFormData({
      patientName: '',
      patientId: '',
      tubeType: TubeType.SERUM,
      count: 1,
      status: SampleStatus.HOLD,
      notes: ''
    });

    if (stayOnPage) {
      // Logic for "Add Another" - Toast could be added here
    } else {
      if (onFinish) onFinish();
    }
  };

  const isAr = lang === 'ar';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-slate-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-50 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none"></div>

      <div className="relative z-10 flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-black flex items-center gap-3 tracking-tight">
          <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
             <ICONS.Plus className="w-6 h-6" />
          </div>
          {isAr ? 'تسجيل عينة جديدة' : 'New Sample Entry'}
        </h2>
        <span className="text-[10px] font-black text-cyan-600 bg-cyan-50 px-3 py-1.5 rounded-lg border border-cyan-100 uppercase tracking-widest shadow-sm">Step 1 of 1</span>
      </div>

      <form className="relative z-10 space-y-8">
        {/* Row 1: Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2 group">
            <label htmlFor="patientName" className="text-xs font-black text-black uppercase tracking-widest px-1 group-focus-within:text-cyan-500 transition-colors flex items-center gap-2">
              <ICONS.UserCog className="w-4 h-4" />
              {isAr ? 'اسم الحالة' : 'Patient Name'}
            </label>
            <input
              id="patientName"
              type="text"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-5 py-4 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all font-bold text-black placeholder:font-normal placeholder:text-black"
              placeholder={isAr ? 'مثال: محمد أحمد علي' : 'e.g. John Doe'}
              value={formData.patientName}
              onChange={e => setFormData({...formData, patientName: e.target.value})}
            />
          </div>
          <div className="space-y-2 group">
            <label htmlFor="patientId" className="text-xs font-black text-black uppercase tracking-widest px-1 group-focus-within:text-cyan-500 transition-colors flex items-center gap-2">
              <ICONS.Database className="w-4 h-4" />
              {isAr ? 'كود المريض' : 'Patient ID'}
            </label>
            <input
              id="patientId"
              type="text"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-5 py-4 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all font-bold text-black placeholder:font-normal placeholder:text-black"
              placeholder="e.g. PAT-9923"
              value={formData.patientId}
              onChange={e => setFormData({...formData, patientId: e.target.value})}
            />
          </div>
        </div>

        {/* Row 2: Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2 group">
            <label htmlFor="tubeType" className="text-xs font-black text-black uppercase tracking-widest px-1 group-focus-within:text-cyan-500 transition-colors flex items-center gap-2">
              <ICONS.Disc className="w-4 h-4" />
              {isAr ? 'نوع الأنابيب' : 'Tube Type'}
            </label>
            <div className="relative">
              <select
                id="tubeType"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-5 py-4 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all font-bold text-black appearance-none cursor-pointer"
                value={formData.tubeType}
                onChange={e => setFormData({...formData, tubeType: e.target.value as TubeType})}
              >
                {Object.values(TubeType).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <div className={`absolute inset-y-0 ${isAr ? 'left-4' : 'right-4'} flex items-center pointer-events-none text-black`}>
                <ICONS.ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="space-y-2 group">
            <label htmlFor="count" className="text-xs font-black text-black uppercase tracking-widest px-1 group-focus-within:text-cyan-500 transition-colors flex items-center gap-2">
              <ICONS.Activity className="w-4 h-4" />
              {isAr ? 'عدد الأنابيب' : 'Count'}
            </label>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-cyan-500 transition-all">
              <button 
                type="button"
                onClick={() => setFormData({...formData, count: Math.max(1, formData.count - 1)})}
                className="px-6 py-4 hover:bg-slate-100 transition-colors text-cyan-500 font-black text-lg"
              >-</button>
              <input
                id="count"
                type="number"
                className="w-full bg-transparent text-center focus:outline-none font-black text-black text-lg"
                value={formData.count}
                onChange={e => setFormData({...formData, count: parseInt(e.target.value) || 1})}
              />
              <button 
                type="button"
                onClick={() => setFormData({...formData, count: formData.count + 1})}
                className="px-6 py-4 hover:bg-slate-100 transition-colors text-cyan-500 font-black text-lg"
              >+</button>
            </div>
          </div>
        </div>

        {/* Row 3: Status Stepper */}
        <div className="space-y-4">
          <label className="text-xs font-black text-black uppercase tracking-widest px-1 flex items-center gap-2">
            <ICONS.ArrowRightLeft className="w-4 h-4" />
            {isAr ? 'مسار الحالة (Status)' : 'Workflow Status'}
          </label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {statusSteps.map((s) => {
               const isActive = formData.status === s.id;
               return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setFormData({...formData, status: s.id})}
                  className={`group flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden shadow-sm ${isActive ? 'border-cyan-500 bg-cyan-50/50 text-cyan-600 shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  {isActive && <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 to-transparent pointer-events-none"></div>}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 relative z-10 ${isActive ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200 group-hover:bg-cyan-500 group-hover:text-white group-hover:border-cyan-500'}`}>
                     <s.icon className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider relative z-10">{s.label}</span>
                </button>
               );
            })}
          </div>
        </div>

        {/* Row 4: Notes */}
        <div className="space-y-2 group">
          <label htmlFor="notes" className="text-xs font-black text-black uppercase tracking-widest px-1 group-focus-within:text-cyan-500 transition-colors flex items-center gap-2">
            <ICONS.FileText className="w-4 h-4" />
            {isAr ? 'الملاحظات' : 'Notes'}
          </label>
          <textarea
            id="notes"
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-5 py-4 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all resize-none font-bold text-black placeholder:font-normal placeholder:text-black"
            placeholder={isAr ? 'اكتب أي ملاحظات إضافية هنا...' : 'Write any additional details here...'}
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col-reverse md:flex-row gap-4 pt-6 mt-8 border-t border-slate-200">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            className="flex-1 bg-slate-50 border border-slate-200 text-black py-4 rounded-lg font-black hover:bg-slate-100 hover:border-slate-300 hover:text-black transition-all uppercase tracking-wider text-xs"
          >
            Save & Add Another
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            className="flex-[2] bg-cyan-500 text-white py-4 rounded-lg font-black hover:bg-cyan-600 transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 border border-cyan-500 relative overflow-hidden group shadow-md"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            <span className="relative z-10 text-black">Save & Finish</span>
            <ICONS.CheckCircle className="w-5 h-5 relative z-10" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default DataEntryForm;