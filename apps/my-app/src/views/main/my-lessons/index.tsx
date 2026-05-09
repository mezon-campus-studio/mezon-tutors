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
    <main className="min-h-screen bg-background">
      <div className="w-full max-w-[1320px] mx-auto px-4 md:px-7 py-4 md:py-6">
        <div className="flex flex-col gap-4 md:gap-5">

          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">{t('header.title')}</h1>
            <button 
              onClick={() => router.push('/tutors')}
              className="bg-primary text-primary-foreground px-3 md:px-4 py-2 rounded-lg text-sm md:text-base font-medium hover:bg-primary/90 transition-colors"
            >
              {t('header.scheduleLesson')}
            </button>
          </div>


          <MyLessonsHeader activeTab={activeTab} onTabChange={setActiveTab} />


          {isLoading && (
            <div className="w-full min-h-[400px] border border-gray-200 rounded-2xl bg-white flex items-center justify-center">
              <p className="text-sm text-gray-500">{t('screen.loading')}</p>
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
