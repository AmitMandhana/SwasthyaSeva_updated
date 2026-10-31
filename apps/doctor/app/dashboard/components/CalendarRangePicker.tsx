'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { componentTestSpec } from '@swasthyaseva/test-gen';

type Props = {
  dateFrom: string | null;
  dateTo: string | null;
  onChange: (from: string | null, to: string | null) => void;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function CalendarRangePicker({ dateFrom, dateTo, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selecting, setSelecting] = useState<'from' | 'to'>('from');

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = daysInMonth(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function handleDayClick(day: number) {
    const ds = toDateStr(viewYear, viewMonth, day);
    if (selecting === 'from') {
      onChange(ds, dateTo && ds <= dateTo ? dateTo : null);
      setSelecting('to');
    } else {
      if (dateFrom && ds < dateFrom) {
        onChange(ds, null);
        setSelecting('to');
      } else {
        onChange(dateFrom, ds);
        setSelecting('from');
        setOpen(false);
      }
    }
  }

  function isInRange(day: number) {
    if (!dateFrom || !dateTo) return false;
    const ds = toDateStr(viewYear, viewMonth, day);
    return ds >= dateFrom && ds <= dateTo;
  }

  function isStart(day: number) {
    return dateFrom === toDateStr(viewYear, viewMonth, day);
  }

  function isEnd(day: number) {
    return dateTo === toDateStr(viewYear, viewMonth, day);
  }

  const label = dateFrom && dateTo
    ? `${dateFrom} → ${dateTo}`
    : dateFrom
    ? `${dateFrom} → ...`
    : 'Select dates';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-xs rounded-md border border-border bg-background text-card-alt hover:bg-muted/50 transition-colors"
      >
        <Calendar className="w-3.5 h-3.5 text-muted-alt" />
        <span>{label}</span>
        {(dateFrom || dateTo) && (
          <span
            data-testid="calendar-clear-btn"
            onClick={(e) => { e.stopPropagation(); onChange(null, null); }}
            className="text-muted-alt hover:text-card-alt ml-1 cursor-pointer"
          >
            ✕
          </span>
        )}
      </button>

      {open && (
        <div data-testid="calendar-popover" className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl p-3 w-64">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button data-testid="calendar-prev-month" onClick={prevMonth} className="p-1 hover:bg-muted rounded transition-colors">
              <ChevronLeft className="w-4 h-4 text-muted-alt" />
            </button>
            <span data-testid="calendar-month-label" className="text-sm font-medium text-card-alt">{MONTHS[viewMonth]} {viewYear}</span>
            <button data-testid="calendar-next-month" onClick={nextMonth} className="p-1 hover:bg-muted rounded transition-colors">
              <ChevronRight className="w-4 h-4 text-muted-alt" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] text-muted-alt font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const start = isStart(day);
              const end = isEnd(day);
              const inRange = isInRange(day);
              const isToday = toDateStr(viewYear, viewMonth, day) === today.toISOString().slice(0, 10);

              return (
                <button
                  key={day}
                  data-testid={i === 0 ? 'calendar-day-cell' : undefined}
                  onClick={() => handleDayClick(day)}
                  className={`text-xs py-1.5 rounded text-center transition-colors
                    ${start || end ? 'bg-primary text-primary-alt font-semibold' : ''}
                    ${inRange && !start && !end ? 'bg-primary/20 text-primary' : ''}
                    ${!start && !end && !inRange ? 'text-card-alt hover:bg-muted' : ''}
                    ${isToday && !start && !end ? 'ring-1 ring-primary/50' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="flex gap-1 mt-2 pt-2 border-t border-border">
            <button
              onClick={() => { onChange(today.toISOString().slice(0, 10), today.toISOString().slice(0, 10)); setOpen(false); }}
              className="flex-1 text-[10px] py-1 rounded bg-muted text-card-alt hover:bg-muted/80 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => {
                const w = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
                onChange(w, today.toISOString().slice(0, 10)); setOpen(false);
              }}
              className="flex-1 text-[10px] py-1 rounded bg-muted text-card-alt hover:bg-muted/80 transition-colors"
            >
              7 days
            </button>
            <button
              onClick={() => {
                const m = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
                onChange(m, today.toISOString().slice(0, 10)); setOpen(false);
              }}
              className="flex-1 text-[10px] py-1 rounded bg-muted text-card-alt hover:bg-muted/80 transition-colors"
            >
              30 days
            </button>
            <button
              onClick={() => {
                const y = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
                onChange(y, today.toISOString().slice(0, 10)); setOpen(false);
              }}
              className="flex-1 text-[10px] py-1 rounded bg-muted text-card-alt hover:bg-muted/80 transition-colors"
            >
              1 year
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/appointments',
  app: 'doctor',
  title: 'Calendar Range Picker',
  elements: {
    triggerBtn: { text: 'Select dates' },
    calendarPopover: { testId: 'calendar-popover' },
    monthLabel: { testId: 'calendar-month-label' },
    prevMonthBtn: { testId: 'calendar-prev-month' },
    nextMonthBtn: { testId: 'calendar-next-month' },
    firstDayCell: { testId: 'calendar-day-cell' },
    todayQuickBtn: { text: 'Today' },
    sevenDaysQuickBtn: { text: '7 days' },
    thirtyDaysQuickBtn: { text: '30 days' },
    oneYearQuickBtn: { text: '1 year' },
    clearBtn: { testId: 'calendar-clear-btn' },
  },
  flows: [
    {
      name: 'open picker and select a date range',
      steps: [
        { on: 'triggerBtn', do: 'click' },
        { on: 'calendarPopover', expect: 'visible' },
        { on: 'firstDayCell', do: 'click' },
      ],
    },
    {
      name: 'use quick range buttons',
      steps: [
        { on: 'triggerBtn', do: 'click' },
        { on: 'todayQuickBtn', do: 'click' },
        { on: 'calendarPopover', expect: 'hidden' },
      ],
    },
  ],
});
