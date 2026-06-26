import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useGetLearningHeatmap } from '@/services/learning-log/learning-log.api';
import { LearningHeatmap } from './LearningHeatmap';
import { Flame, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function LearningProgressSection() {
  const t = useTranslations('Practice.progress');
  const { data, isLoading } = useGetLearningHeatmap(7);

  const heatmapMap = useMemo(() => {
    const map = new Map<string, number>();
    if (data?.heatmap) {
      data.heatmap.forEach((item) => {
        map.set(item.date, item.count);
      });
    }
    return map;
  }, [data]);

  return (
    <div className="mb-6 flex flex-col gap-6">
      {/* Top Header stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Streak counts */}
        <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row items-center gap-6 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm shadow-violet-100/40">
           <div className="flex flex-col items-start gap-1">
             <div className="flex items-center gap-2 text-slate-500">
               <Flame className="w-5 h-5 text-slate-300" />
               <span className="text-xs font-semibold uppercase tracking-wider">{t('currentStreak')}</span>
             </div>
             {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : (
               <span className="text-3xl font-extrabold text-slate-900">{data?.currentStreak ?? 0}</span>
             )}
           </div>

           <div className="hidden sm:block h-12 border-l border-slate-100"></div>

           <div className="flex flex-col items-start gap-1">
             <div className="flex items-center gap-2 text-slate-500">
               <Flame className="w-5 h-5 text-slate-200" />
               <span className="text-xs font-semibold uppercase tracking-wider">{t('longestStreak')}</span>
             </div>
             {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : (
               <span className="text-3xl font-extrabold text-slate-900">{data?.longestStreak ?? 0}</span>
             )}
           </div>
        </div>

        {/* Motivational / Goal item */}
        <div className="col-span-1 flex items-center justify-center gap-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm shadow-violet-100/40 min-h-[100px]">
           <div className="flex flex-col items-center sm:flex-row gap-4">
             <div className="flex items-center justify-center h-12 w-12 rounded-full bg-violet-50">
               <Trophy className="w-6 h-6 text-violet-300" />
             </div>
             <p className="text-sm font-medium text-slate-600 max-w-[200px] text-center sm:text-left">
               {t('motivationText')}
             </p>
           </div>
        </div>
      </div>

      {/* Heatmap Section */}
      <div className="rounded-2xl border border-violet-100 bg-white p-5 md:p-6 shadow-sm shadow-violet-100/40">
        <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
          <h2 className="text-lg font-bold text-slate-900">{t('myPractice')}</h2>
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div> {t('totalPracticeCounts')}
              </span>
              {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : (
                <span className="text-2xl font-bold text-slate-900 leading-tight mt-1">
                  {data?.totalWords ?? 0}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="w-full">
          {isLoading ? (
            <Skeleton className="w-full h-32 rounded-xl" />
          ) : (
            <LearningHeatmap heatmapData={heatmapMap} months={7} />
          )}
        </div>
      </div>
    </div>
  );
}
