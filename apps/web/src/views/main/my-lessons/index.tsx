'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { useGetMyLessonsOverview } from '@/services/my-lessons/my-lessons.api';
import MyLessonsHeader from './components/MyLessonsHeader';
import MyLessonsCalendarSection from './components/MyLessonsCalendarSection';
import MyLessonsPanel from './components/MyLessonsPanel';
import MyLessonsTutorsSection from './components/MyTutorsPanel';

type MyLessonsTab = 'lessons' | 'calendar' | 'tutors';

export default function MyLessonsPage() {
  const t = useTranslations('MyLessons');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MyLessonsTab>('calendar');
  const [selectedDate, setSelectedDate] = useState(dayjs());

  const dayOfWeek = selectedDate.day();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = selectedDate.subtract(mondayOffset, 'day').startOf('day');
  const weekStartDate = monday.format('YYYY-MM-DD');

  const { data, isLoading } = useGetMyLessonsOverview(weekStartDate);

  const handlePrevWeek = () => setSelectedDate((prev) => prev.subtract(7, 'day'));
  const handleNextWeek = () => setSelectedDate((prev) => prev.add(7, 'day'));
  
  const isCurrentWeek = () => {
    const today = dayjs();
    const todayDayOfWeek = today.day();
    const todayMondayOffset = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
    const todayMonday = today.subtract(todayMondayOffset, 'day').startOf('day');
    return monday.isSame(todayMonday, 'day');
  };

  const handleGoToToday = () => {
    setSelectedDate(dayjs());
  };

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-[1320px] px-4 py-6 md:px-7 md:py-8">
        <div className="flex flex-col gap-5 md:gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                {t('header.title')}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {t('header.subtitle', { defaultValue: 'Theo dõi lịch học và gia sư của bạn' })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/tutors')}
              className="group inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-5 text-sm font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50"
            >
              + {t('header.scheduleLesson')}
            </button>
          </div>

          <MyLessonsHeader activeTab={activeTab} onTabChange={setActiveTab} />

          {isLoading && (
            <div className="flex min-h-[400px] w-full items-center justify-center rounded-2xl border border-violet-100 bg-white">
              <p className="text-sm text-slate-500">{t('screen.loading')}</p>
            </div>
          )}


          {data && !isLoading && (
            <>
              {activeTab === 'calendar' && (
                <MyLessonsCalendarSection
                  calendar={data.calendar}
                  lessons={data.calendarLessons}
                  onPrevWeek={handlePrevWeek}
                  onNextWeek={handleNextWeek}
                  onGoToToday={handleGoToToday}
                  isCurrentWeek={isCurrentWeek()}
                />
              )}

              {activeTab === 'lessons' && (
                <MyLessonsPanel
                  upcomingLessons={data.upcomingLessons}
                  previousLessons={data.previousLessons}
                />
              )}

              {activeTab === 'tutors' && (
                <MyLessonsTutorsSection tutors={data.tutors} />
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
