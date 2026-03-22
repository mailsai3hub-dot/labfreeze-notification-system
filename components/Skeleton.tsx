import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={`animate-pulse bg-slate-200/80 ${className}`} />
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    {/* KPI Grid */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 h-32 flex flex-col justify-center items-center gap-3">
           <Skeleton className="w-12 h-12 rounded-xl bg-slate-100" />
           <div className="flex flex-col items-center gap-2 w-full">
             <Skeleton className="w-20 h-3 rounded-md" />
             <Skeleton className="w-12 h-6 rounded-md" />
           </div>
        </div>
      ))}
    </div>

    {/* Main Content Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Chart Section */}
      <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-slate-100 h-[400px] flex flex-col">
        <Skeleton className="w-40 h-6 mb-8 rounded-lg" />
        <div className="flex-1 flex items-center justify-center">
           <Skeleton className="w-48 h-48 rounded-full border-8 border-slate-50" />
        </div>
      </div>
      
      {/* Activity Section */}
      <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 h-[400px]">
        <div className="flex justify-between items-center mb-8">
            <Skeleton className="w-48 h-6 rounded-lg" />
            <Skeleton className="w-20 h-4 rounded-lg" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
             <div key={i} className="flex justify-between items-center p-3 border border-slate-50 rounded-2xl">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="w-32 h-3 rounded-md" />
                    <Skeleton className="w-24 h-2 rounded-md" />
                  </div>
                </div>
                <Skeleton className="w-16 h-6 rounded-full" />
             </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const AppSkeleton: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-row-reverse bg-slate-50" dir="rtl">
      {/* Sidebar Skeleton */}
      <aside className="w-64 bg-white border-l border-slate-200 flex flex-col h-screen sticky top-0 p-4 gap-6 hidden md:flex z-50">
         <div className="h-32 flex flex-col items-center justify-center border-b border-slate-50 gap-3 pb-4">
            <Skeleton className="w-16 h-16 rounded-2xl bg-blue-50" />
            <Skeleton className="w-32 h-4 rounded-lg" />
            <Skeleton className="w-20 h-3 rounded-lg" />
         </div>
         <div className="space-y-3 flex-1">
            {[1,2,3,4,5,6].map(i => (
               <Skeleton key={i} className="w-full h-14 rounded-2xl" />
            ))}
         </div>
         <div className="mt-auto pt-6 border-t border-slate-50">
            <Skeleton className="w-full h-14 rounded-2xl" />
         </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header Skeleton */}
        <header className="h-28 bg-white border-b border-slate-200 px-12 flex items-center justify-between sticky top-0 z-40">
           <div className="flex flex-col gap-3">
              <Skeleton className="w-64 h-8 rounded-lg" />
              <div className="flex gap-2">
                 <Skeleton className="w-24 h-4 rounded-lg" />
                 <Skeleton className="w-20 h-4 rounded-lg bg-blue-50" />
              </div>
           </div>
           <div className="flex items-center gap-6">
              <Skeleton className="w-40 h-12 rounded-xl" />
              <div className="flex items-center gap-4 border-r border-slate-100 pr-6">
                 <div className="text-left space-y-2">
                    <Skeleton className="w-32 h-4 rounded-lg" />
                    <Skeleton className="w-24 h-3 rounded-lg" />
                 </div>
                 <Skeleton className="w-14 h-14 rounded-2xl" />
              </div>
           </div>
        </header>

        {/* Content Skeleton */}
        <main className="flex-1 p-6 overflow-y-auto">
           <DashboardSkeleton />
        </main>
      </div>
    </div>
  );
};