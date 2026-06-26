import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface LearningHeatmapProps {
  heatmapData: Map<string, number>;
  months?: number;
}

const MONTH_KEYS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec"
];

// Fallback English names for buildHeatmapData (locale-independent)
const MONTH_NAMES_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function getColor(count: number): string {
  if (count === 0) return '#ebedf0';
  if (count < 5) return '#c6e48b';
  if (count < 10) return '#7bc96f';
  if (count < 20) return '#239a3b';
  return '#196127';
}

type CellData = 
  | { type: 'empty' }
  | { type: 'day'; dateKey: string; dateObj: Date; count: number; isFuture: boolean };

interface MonthBlockData {
  year: number;
  month: number;
  monthName: string;
  cells: CellData[];
}

function buildHeatmapData(logMap: Map<string, number>, monthsToShow: number): MonthBlockData[] {
  const blocks: MonthBlockData[] = [];
  const today = new Date();
  
  // Start month: go back `monthsToShow - 1` months
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth() - monthsToShow + 1;
  while (currentMonth < 0) {
    currentMonth += 12;
    currentYear -= 1;
  }

  for (let i = 0; i < monthsToShow; i++) {
    const y = currentMonth > 11 ? currentYear + Math.floor(currentMonth / 12) : currentYear;
    const m = currentMonth % 12;
    
    const firstDay = new Date(y, m, 1);
    const offset = (firstDay.getDay() + 6) % 7; // Mon=0, Sun=6
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    
    const cells: CellData[] = [];
    
    // Empty cells at the start of the month
    for (let j = 0; j < offset; j++) {
      cells.push({ type: 'empty' });
    }
    
    // Real day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(y, m, d);
      const isFuture = dateObj > today;
      
      const mm = String(m + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateKey = `${y}-${mm}-${dd}`;
      const count = isFuture ? 0 : (logMap.get(dateKey) || 0);
      
      cells.push({ type: 'day', dateKey, dateObj, count, isFuture });
    }
    
    // Pad to finish the column week
    while (cells.length % 7 !== 0) {
      cells.push({ type: 'empty' });
    }

    blocks.push({
      year: y,
      month: m,
      monthName: MONTH_NAMES_EN[m],
      cells
    });
    
    currentMonth++;
  }
  
  return blocks;
}

export function LearningHeatmap({ heatmapData, months = 7 }: LearningHeatmapProps) {
  const t = useTranslations('Practice.progress.heatmap');
  const monthBlocks = useMemo(() => buildHeatmapData(heatmapData, months), [heatmapData, months]);

  const todayDate = new Date();
  const todayKey = `${todayDate.getFullYear()}-${String(todayDate.getMonth()+1).padStart(2,'0')}-${String(todayDate.getDate()).padStart(2,'0')}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row overflow-x-auto pb-4 custom-scrollbar w-full">
        {/* Y-axis Labels (Mon, Tue, ...) */}
        <div className="flex flex-col flex-shrink-0 mr-2 text-[11px] leading-[16px] text-slate-400 gap-[4px] pt-[42px] pr-2">
           <div style={{ height: '16px' }}>{t('weekdays.mon')}</div>
           <div style={{ height: '16px', opacity: 0 }}>Tue</div>
           <div style={{ height: '16px' }}>{t('weekdays.wed')}</div>
           <div style={{ height: '16px', opacity: 0 }}>Thu</div>
           <div style={{ height: '16px' }}>{t('weekdays.fri')}</div>
           <div style={{ height: '16px', opacity: 0 }}>Sat</div>
           <div style={{ height: '16px', opacity: 0 }}>Sun</div>
        </div>

        <TooltipProvider delay={200}>
          <div className="flex justify-between w-full min-w-max gap-2 pr-4">
            {monthBlocks.map((block, bIndex) => {
              const showYear = bIndex === 0 || block.month === 0;
              const cols = [];
              for (let i = 0; i < block.cells.length; i += 7) {
                cols.push(block.cells.slice(i, i + 7));
              }

              return (
                <div key={bIndex} className="flex flex-col gap-[8px]">
                  {/* Year and Month Labels */}
                  <div className="flex flex-col gap-1">
                    <div className="text-[13px] font-bold text-slate-700 h-[16px] flex items-end">
                      {showYear ? block.year : ''}
                    </div>
                    <div className="text-[12px] text-slate-500 leading-[12px]">
                      {t(`months.${MONTH_KEYS[block.month]}`)}
                    </div>
                  </div>

                  
                  {/* Month Grid */}
                  <div className="flex gap-[4px]">
                    {cols.map((col, cIndex) => (
                      <div key={cIndex} className="flex flex-col gap-[4px]">
                        {col.map((cell, cellIndex) => {
                          if (cell.type === 'empty') {
                            return <div key={cellIndex} className="w-4 h-4 bg-transparent" />;
                          }

                          const localizedMonth = t(`months.${MONTH_KEYS[cell.dateObj.getMonth()]}`);
                          const displayDate = t('dateFormat', {
                            day: cell.dateObj.getDate(),
                            month: localizedMonth,
                            year: cell.dateObj.getFullYear(),
                          });
                          const isToday = cell.dateKey === todayKey;
                          const color = cell.isFuture ? '#transparent' : getColor(cell.count);

                          return (
                            <Tooltip key={cellIndex}>
                              <TooltipTrigger
                                className="w-4 h-4 rounded-[3px] outline-none cursor-pointer hover:ring-1 hover:ring-black/20"
                                style={{ 
                                  backgroundColor: color, 
                                  padding: 0, 
                                  border: isToday ? '1px solid #000' : 'none',
                                  opacity: cell.isFuture ? 0 : 1
                                }}
                              />
                              {!cell.isFuture && (
                                <TooltipContent>
                                  <p className="text-xs">
                                    <span className="font-semibold text-slate-100">{t('wordsLearned', { count: cell.count })}</span> {t('wordsLearnedOn', { date: displayDate })}
                                  </p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 text-[11px] text-slate-500 mt-2 pr-2">
        <span>{t('less')}</span>
        <div className="flex gap-[4px] mx-1">
          <div className="w-4 h-4 rounded-[3px]" style={{ backgroundColor: '#ebedf0' }}></div>
          <div className="w-4 h-4 rounded-[3px]" style={{ backgroundColor: '#c6e48b' }}></div>
          <div className="w-4 h-4 rounded-[3px]" style={{ backgroundColor: '#7bc96f' }}></div>
          <div className="w-4 h-4 rounded-[3px]" style={{ backgroundColor: '#239a3b' }}></div>
          <div className="w-4 h-4 rounded-[3px]" style={{ backgroundColor: '#196127' }}></div>
        </div>
        <span>{t('more')}</span>
      </div>
    </div>
  );
}
