
import React, { useState, useRef } from 'react';
import { ICONS } from '../constants';
import { editMedicalImage } from '../services/geminiService';

interface ImageEditorProps {
  lang: 'ar' | 'en';
}

const ImageEditor: React.FC<ImageEditorProps> = ({ lang }) => {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{imageUrl: string | null, text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!image || !prompt) return;
    setLoading(true);
    const res = await editMedicalImage(image, prompt);
    if (res.success) {
      setResult({ imageUrl: res.imageUrl || null, text: res.text || '' });
    } else {
      alert(lang === 'ar' ? 'حدث خطأ في معالجة الصورة' : 'Error processing image');
    }
    setLoading(false);
  };

  const isAr = lang === 'ar';

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white/20 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-white/30">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
            <ICONS.Camera className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-black">
              {isAr ? 'التحليل الذكي للصور الطبية' : 'AI Medical Image Analysis'}
            </h2>
            <p className="text-black text-sm">
              {isAr ? 'ارفع صورة للنتائج أو العينة واطلب من الذكاء الاصطناعي تحليلها أو تحسينها' : 'Upload a lab result or sample image for AI analysis or enhancement'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all overflow-hidden relative group"
            >
              {image ? (
                <>
                  <img src={image} className="w-full h-full object-cover" alt="Uploaded" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white font-bold">{isAr ? 'تغيير الصورة' : 'Change Image'}</p>
                  </div>
                </>
              ) : (
                <>
                  <ICONS.Plus className="w-12 h-12 text-black mb-2" />
                  <p className="text-black font-medium">{isAr ? 'اضغط لرفع صورة' : 'Click to upload'}</p>
                </>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-black">{isAr ? 'ماذا تريد أن تفعل؟' : 'What would you like to do?'}</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
                rows={3}
                placeholder={isAr ? 'مثال: قم بتحسين وضوح الصورة، أو استخرج بيانات المريض من التقرير' : 'e.g. Enhance clarity, or extract patient data from this report'}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
            </div>

            <button
              onClick={handleProcess}
              disabled={!image || !prompt || loading}
              className="w-full bg-[#0056b3] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 disabled:opacity-50 hover:shadow-lg transition-all btn-ripple"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <ICONS.Camera className="w-5 h-5" />
                  {isAr ? 'معالجة بواسطة Gemini' : 'Process with Gemini'}
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col">
            <h3 className="font-bold text-black mb-4 flex items-center gap-2">
              <div className="w-2 h-4 bg-blue-500 rounded-full"></div>
              {isAr ? 'النتائج' : 'Analysis Result'}
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-4">
              {result ? (
                <>
                  {result.imageUrl && (
                    <div className="rounded-2xl overflow-hidden shadow-md border border-white">
                      <img src={result.imageUrl} alt="AI Result" className="w-full" />
                    </div>
                  )}
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 text-sm leading-relaxed text-black whitespace-pre-wrap">
                    {result.text}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-black italic text-center p-8">
                  <ICONS.Search className="w-12 h-12 mb-2 opacity-20" />
                  <p>{isAr ? 'بانتظار البدء في المعالجة...' : 'Waiting for processing to start...'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
