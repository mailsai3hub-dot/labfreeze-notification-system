import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { storageService } from '../services/storageService';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    try {
      const savedUsername = localStorage.getItem('lf_saved_username');
      const savedPassword = localStorage.getItem('lf_saved_password');

      if (savedUsername && savedPassword) {
        setUsername(savedUsername);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    } catch (e) {
      console.warn('localStorage is not available', e);
    }
  }, []);

  const clearRememberedCredentials = () => {
    try {
      localStorage.removeItem('lf_saved_username');
      localStorage.removeItem('lf_saved_password');
    } catch (e) {
      console.warn('localStorage not available', e);
    }
  };

  const saveRememberedCredentials = (savedUsername: string, savedPassword: string) => {
    try {
      localStorage.setItem('lf_saved_username', savedUsername);
      localStorage.setItem('lf_saved_password', savedPassword);
    } catch (e) {
      console.warn('localStorage not available', e);
    }
  };

  const resetError = () => {
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetError();
    setIsVerifying(true);

    try {
      const cleanUsername = username.trim().toLowerCase();
      const cleanPassword = password.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanUsername) {
        setError('يرجى إدخال اسم المستخدم');
        setIsVerifying(false);
        return;
      }

      if (!cleanPassword) {
        setError('يرجى إدخال كلمة المرور');
        setIsVerifying(false);
        return;
      }

      if (isSignup) {
        if (cleanPassword.length < 6) {
          setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
          setIsVerifying(false);
          return;
        }

        const signupEmail = cleanEmail || `${cleanUsername}@lab.com`;
        const result = await storageService.signup(signupEmail, cleanPassword, cleanUsername);

        if (result.error) {
          if (result.error === 'username-taken') {
            setError('اسم المستخدم محجوز بالفعل');
          } else if (result.error === 'User already exists. Please sign in') {
            setError('الحساب موجود بالفعل، قم بتسجيل الدخول');
          } else if (result.error === 'Invalid email format') {
            setError('صيغة البريد الإلكتروني غير صحيحة');
          } else if (result.error === 'Password should be at least 6 characters') {
            setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
          } else {
            setError(result.error);
          }
          setIsVerifying(false);
          return;
        }

        if (result.requiresVerification) {
          setError('تم إرسال بريد التحقق. يرجى تفعيل الحساب أولاً ثم تسجيل الدخول.');
          setIsVerifying(false);
          return;
        }

        if (result.user) {
          if (rememberMe) {
            saveRememberedCredentials(cleanUsername, cleanPassword);
          } else {
            clearRememberedCredentials();
          }
          onLogin(result.user);
          return;
        }

        setIsSignup(false);
        setPassword('');
        setError('تم إنشاء الحساب بنجاح. يمكنك الآن تسجيل الدخول.');
        setIsVerifying(false);
        return;
      }

      const result = await storageService.loginByUsername(cleanUsername, cleanPassword);
      const { user, error: authError } = result;

      if (user && !authError) {
        if (rememberMe) {
          saveRememberedCredentials(cleanUsername, cleanPassword);
        } else {
          clearRememberedCredentials();
        }

        onLogin(user);
        return;
      }

      if (authError === 'user-not-found') {
        setError('اسم المستخدم غير موجود');
      } else if (authError === 'auth/invalid-credential') {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      } else if (typeof authError === 'string' && authError.trim()) {
        setError(authError);
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      }

      setIsVerifying(false);
    } catch (err: any) {
      console.error('Login submit error:', err);
      setError('خطأ في الاتصال بالخادم');
      setIsVerifying(false);
    }
  };

  return (
    <div
      className="h-screen w-screen flex items-center justify-center overflow-hidden font-['Cairo'] select-none relative bg-slate-900"
      dir="rtl"
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=2070")',
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-4xl h-[600px] flex shadow-2xl rounded-[40px] overflow-hidden border border-white/20"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Logo Side */}
        <div className="w-1/2 flex flex-col items-center justify-center p-12 text-center border-l border-white/10">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-[360px] h-[360px] object-contain"
            style={{
              filter: 'drop-shadow(0 0 6px #00E5FF) drop-shadow(0 0 18px #00E5FF)'
            }}
          />

          <h1
            className="text-xl font-medium text-[#00E5FF] tracking-[0.25em] uppercase leading-none -translate-y-10"
            style={{
              textShadow: '0 0 6px #00E5FF, 0 0 12px #00E5FF'
            }}
          >
            GENEOPS ADMINISTRATION SYSTEM
          </h1>

          <p
            className="font-bold text-sm text-[#00E5FF] mt-4 -translate-y-10"
            style={{
              textShadow: '0 0 4px #00E5FF'
            }}
          >
            نظام إدارة المعامل المتكامل - معامل أجيال للوراثة الطبية
          </p>
        </div>

        {/* Form Side */}
        <div className="w-1/2 bg-white/90 backdrop-blur-md flex flex-col justify-center p-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-black text-black text-center">
              {isSignup ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </h2>

            {error && (
              <div className="bg-rose-50 text-rose-600 border border-rose-100 px-4 py-2 rounded-xl text-sm text-center font-bold">
                {error}
              </div>
            )}

            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                resetError();
              }}
              placeholder="اسم المستخدم"
              className="w-full border rounded-xl px-4 py-2 text-right"
              disabled={isVerifying}
            />

            {isSignup && (
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  resetError();
                }}
                placeholder="البريد الإلكتروني"
                className="w-full border rounded-xl px-4 py-2 text-right"
                disabled={isVerifying}
              />
            )}

            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                resetError();
              }}
              placeholder="كلمة المرور"
              className="w-full border rounded-xl px-4 py-2 text-right"
              disabled={isVerifying}
            />

            {!isSignup && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isVerifying}
                />
                <span className="text-sm">ذكرني</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isVerifying ? 'جاري التحقق...' : isSignup ? 'إنشاء حساب' : 'دخول'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setError('');
                  setPassword('');
                  setEmail('');
                }}
                className="text-teal-600 text-sm"
                disabled={isVerifying}
              >
                {isSignup ? 'لديك حساب؟ سجل دخول' : 'إنشاء حساب جديد'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;