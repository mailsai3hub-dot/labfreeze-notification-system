import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sample, SampleStatus, TubeType } from '../types';
import { ICONS } from '../constants';

interface EditSampleModalProps {
  sample: Sample;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Sample>) => Promise<void>;
  lang: 'ar' | 'en';
}

const EditSampleModal: React.FC<EditSampleModalProps> = ({ sample, isOpen, onClose, onSave, lang }) => {
  const isAr = lang === 'ar';
  const [formData, setFormData] = useState<Partial<Sample>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (sample) {
      setFormData({
        patient_name: sample.patient_name,
        patient_id: sample.patient_id,
        tube_type: sample.tube_type,
        count: sample.count,
        status: sample.status,
        notes: sample.notes || '',
        finished_at: sample.finished_at
      });
    }
  }, [sample]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(sample.id, formData);
      // Only close if save was successful (onSave should throw if it fails)
      onClose();
    } catch (error) {
      console.error("Failed to save", error);
      alert(isAr ? 'فشل حفظ التغييرات' : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 relative animate-in zoom-in-95 duration-300 font-['Cairo'] flex flex-col max-h-[90vh]">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors shrink-0 z-10"
        >
          <ICONS.X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-black text-slate-800 mb-6 text-center shrink-0">
          {isAr ? 'تعديل بيانات العينة' : 'Edit Sample Details'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto min-h-0 pr-2">
          <div>
            <label htmlFor="editPatientName" className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1 block">
              {isAr ? 'اسم المريض' : 'Patient Name'}
            </label>
            <input 
              id="editPatientName"
              type="text" 
              value={formData.patient_name || ''}
              onChange={e => setFormData({...formData, patient_name: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="editPatientId" className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1 block">
                {isAr ? 'كود المريض' : 'Patient ID'}
              </label>
              <input 
                id="editPatientId"
                type="text" 
                value={formData.patient_id || ''}
                onChange={e => setFormData({...formData, patient_id: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label htmlFor="editTubeType" className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1 block">
                {isAr ? 'نوع الأنبوب' : 'Tube Type'}
              </label>
              <select 
                id="editTubeType"
                value={formData.tube_type || ''}
                onChange={e => setFormData({...formData, tube_type: e.target.value as TubeType})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {Object.values(TubeType).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label htmlFor="editCount" className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1 block">
                {isAr ? 'العدد' : 'Count'}
              </label>
              <input 
                id="editCount"
                type="number" 
                min="1"
                value={formData.count || 1}
                onChange={e => setFormData({...formData, count: parseInt(e.target.value)})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label htmlFor="editStatus" className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1 block">
                {isAr ? 'الحالة' : 'Status'}
              </label>
              <select 
                id="editStatus"
                value={formData.status || ''}
                onChange={e => setFormData({...formData, status: e.target.value as SampleStatus})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {Object.values(SampleStatus).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {formData.status === SampleStatus.FINISHED && (
            <div>
              <label htmlFor="editFinishedDate" className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1 block">
                {isAr ? 'تاريخ الانتهاء' : 'Finished Date'}
              </label>
              <input 
                id="editFinishedDate"
                type="datetime-local"
                value={formData.finished_at ? new Date(formData.finished_at).toISOString().slice(0, 16) : ''}
                onChange={e => setFormData({...formData, finished_at: new Date(e.target.value).toISOString()})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          )}

          <div>
            <label htmlFor="editNotes" className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1 block">
              {isAr ? 'ملاحظات' : 'Notes'}
            </label>
            <textarea 
              id="editNotes"
              value={formData.notes || ''}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all h-24 resize-none"
            />
          </div>

          <div className="pt-4 flex gap-3 shrink-0 sticky bottom-0 bg-white pb-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-black text-slate-500 hover:bg-slate-100 transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ICONS.Check className="w-5 h-5" />
                  {isAr ? 'حفظ التغييرات' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditSampleModal;
