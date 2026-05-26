'use client'

import { ClipboardList, Search } from 'lucide-react'

import { useTranslations } from 'next-intl'

import { useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import { toast } from 'sonner'

import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'

import {
  useGetMyTrialLessonBookingRequests,
  type TrialLessonBookingRequestItem,
  type TrialLessonBookingRequestStatusFilter,
} from '@/services'

import { ROUTES } from '@mezon-tutors/shared'

import TutorsPagination from '@/views/main/tutors/components/TutorsPagination'

import BookingRequestsMetrics from './components/BookingRequestsMetrics'
import BookingRequestsTable from './components/BookingRequestsTable'

import type { TutorBookingRequestUiStatus } from '@/lib/trial-booking-status'

const STATUS_FILTERS: Array<{
  value: 'all' | TrialLessonBookingRequestStatusFilter
  labelKey: 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'
}> = [
  { value: 'all', labelKey: 'all' },
  { value: 'PENDING', labelKey: 'pending' },
  { value: 'CONFIRMED', labelKey: 'confirmed' },
  { value: 'COMPLETED', labelKey: 'completed' },
  { value: 'CANCELLED', labelKey: 'cancelled' },
]

const PAGE_SIZE = 10

export default function BookingRequestsView() {
  const t = useTranslations('Dashboard.bookingRequests')

  const tTable = useTranslations('Dashboard.bookingRequests.table')

  const router = useRouter()

  const [search, setSearch] = useState('')

  const [statusFilter, setStatusFilter] = useState<'all' | TrialLessonBookingRequestStatusFilter>(
    'all'
  )

  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useGetMyTrialLessonBookingRequests({
    status: statusFilter === 'all' ? undefined : statusFilter,

    page,

    limit: PAGE_SIZE,
  })

  const items = data?.items ?? []

  const meta = data?.meta

  const filtered = useMemo(() => {
    const trimmed = search.trim().toLowerCase()

    if (!trimmed) return items

    return items.filter((item) => item.studentName.toLowerCase().includes(trimmed))
  }, [items, search])

  const counts = useMemo(() => {
    const map: Record<TutorBookingRequestUiStatus | 'total', number> = {
      total: items.length,

      pending: 0,

      confirmed: 0,

      completed: 0,

      cancelled: 0,
    }

    for (const item of items) {
      const upper = String(item.status).toUpperCase()

      if (upper === 'PENDING') map.pending += 1
      else if (upper === 'CONFIRMED') map.confirmed += 1
      else if (upper === 'COMPLETED') map.completed += 1
      else if (upper === 'CANCELLED') map.cancelled += 1
    }

    return map
  }, [items])

  const totalPages = meta?.totalPages ?? 1

  const handleViewDetail = (bookingId: string) => {
    router.push(ROUTES.DASHBOARD.TRIAL_BOOKING_DETAIL(bookingId))
  }

  const handleReschedule = (_item: TrialLessonBookingRequestItem) => {
    toast.info(tTable('rescheduleComingSoon'))
  }

  return (
    <div className="mx-auto w-full px-4 py-6 md:px-7 md:py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-md shadow-violet-300/40">
            <ClipboardList className="size-6" />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
              {t('eyebrow')}
            </p>

            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
              {t('title')}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {t('subtitle', { count: counts.pending })}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <BookingRequestsMetrics counts={counts} isLoading={isLoading} />
      </div>

      <div className="mb-4 flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

          <Input
            placeholder={t('searchPlaceholder')}
            className="h-11 rounded-full border-violet-100 bg-white pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as 'all' | TrialLessonBookingRequestStatusFilter)

            setPage(1)
          }}
        >
          <SelectTrigger className="h-11 w-full rounded-full border-violet-100 bg-white md:w-48">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {STATUS_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(`filters.${option.labelKey}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <BookingRequestsTable
        items={filtered}
        isLoading={isLoading}
        isFetching={isFetching}
        onViewDetail={handleViewDetail}
        onReschedule={handleReschedule}
      />

      <div className="pt-6">
        <TutorsPagination
          page={page}
          totalPages={totalPages}
          isFetching={isFetching}
          onPageChangeAction={setPage}
        />
      </div>
    </div>
  )
}
