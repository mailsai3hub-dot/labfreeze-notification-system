import React from 'react';
import { Search, Filter, Plus, Bell, Wifi, WifiOff, LoaderCircle } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentUser: User;
  isSyncing?: boolean;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({
  lang,
  setLang,
  searchQuery,
  setSearchQuery,
  currentUser,
  isSyncing = false,
  onLogout
}) => {
  const isAr = lang === 'ar';

  const hasRealUser = !!currentUser && currentUser.id !== 'guest' && !!currentUser.name;

  const connectionState: 'syncing' | 'online' | 'offline' = isSyncing
    ? 'syncing'
    : hasRealUser
      ? 'online'
      : 'offline';

  const connectionLabel = (() => {
    if (connectionState === 'syncing') {
      return isAr ? 'جاري المزامنة...' : 'Syncing...';
    }

    if (connectionState === 'online') {
      return isAr ? 'متصل' : 'Online';
    }

    return isAr ? 'غير متصل' : 'Offline';
  })();

  const ConnectionIcon =
    connectionState === 'syncing'
      ? LoaderCircle
      : connectionState === 'online'
        ? Wifi
        : WifiOff;

  const connectionClassName =
    connectionState === 'syncing'
      ? 'bg-amber-50 border-amber-200 text-amber-700'
      : connectionState === 'online'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : 'bg-rose-50 border-rose-200 text-rose-700';

  const dotClassName =
    connectionState === 'syncing'
      ? 'bg-amber-500'
      : connectionState === 'online'
        ? 'bg-emerald-500'
        : 'bg-rose-500';

  return (
    <header className="h-20 px-8 flex items-center justify-between sticky top-0 z-30 bg-white backdrop-blur-xl border-b border-slate-100 transition-all duration-300">
      {/* Right Side */}
      <div className="flex items-center flex-1 max-w-5xl gap-8">
        {/* Logo Section */}
        <div className={`flex items-center gap-3 ${isAr ? 'pl-4' : 'pr-4'}`}>
          <img
            src="/logo.png"
            alt="Logo"
            className="h-10 w-auto object-contain"
          />
          <span className="font-sans font-bold text-black text-[14px] uppercase tracking-[0.25em] whitespace-nowrap leading-none hidden xl:block">
            GENEOPS ADMINISTRATION SYSTEM
          </span>
        </div>

        {/* Search */}
        <div className="flex items-center flex-1 max-w-2xl">
          <div className="flex items-center w-full bg-slate-100/50 backdrop-blur-md border border-slate-200 shadow-sm rounded-full p-1.5 pr-2">
            <div className="relative flex-1 group flex items-center">
              <div className={`flex items-center pointer-events-none text-black ${isAr ? 'ml-3' : 'mr-3'}`}>
                <Search className="w-4 h-4" />
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث سريع في النظام...' : 'Global search...'}
                className="w-full bg-transparent border-none py-2 text-sm font-medium text-black placeholder:text-black/40 outline-none"
              />

              <div className={`${isAr ? 'mr-2' : 'ml-2'}`}>
                <button className="p-2 hover:bg-slate-100 rounded-full" type="button">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Left Side */}
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border ${connectionClassName}`}>
          <div className={`w-2 h-2 rounded-full ${dotClassName} ${connectionState === 'syncing' ? 'animate-pulse' : ''}`}></div>

          <ConnectionIcon className={`w-4 h-4 ${connectionState === 'syncing' ? 'animate-spin' : ''}`} />

          <span className="text-xs font-black uppercase tracking-wider">
            {connectionLabel}
          </span>
        </div>

        {/* Actions */}
        <button
          type="button"
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-black hover:text-white flex items-center justify-center transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          type="button"
          className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center relative transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>

        {/* Language */}
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-sm font-black border transition-colors"
          type="button"
        >
          {lang === 'ar' ? 'EN' : 'عربي'}
        </button>

        {/* User */}
        <div className={`flex items-center gap-3 ${isAr ? 'border-r pr-4 mr-2' : 'border-l pl-4 ml-2'} border-slate-200`}>
          <div className="hidden md:block">
            <p className="text-sm font-bold text-black">{currentUser.name}</p>
            <p className="text-[10px] font-bold text-black uppercase mt-1">
              {currentUser.role}
            </p>
          </div>

          <button
            type="button"
            className="cursor-pointer"
            onClick={onLogout}
            title={isAr ? 'تسجيل الخروج' : 'Logout'}
          >
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=2563EB&color=fff`}
              className="w-10 h-10 rounded-xl"
              alt={currentUser.name}
            />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;