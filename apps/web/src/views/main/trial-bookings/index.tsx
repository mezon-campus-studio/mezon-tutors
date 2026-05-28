'use client'

import { ClipboardList, Search } from 'lucide-react'

import { useLocale, useTranslations } from 'next-intl'

import { useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import { useQueryClient } from '@tanstack/react-query'

import { toast } from 'sonner'

import dayjs from 'dayjs'

import timezone from 'dayjs/plugin/timezone'

import utc from 'dayjs/plugin/utc'

import { useAtomValue } from 'jotai'

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
  useTutorCancelTrialLessonMutation,
  useTutorRescheduleRequestMutation,
  type TrialLessonBookingRequestItem,
  type TrialLessonBookingRequestStatusFilter,
} from '@/services'
import {
  createMezonLightDM,
  persistMezonLightSession,
  refreshMezonLightSession,
  restoreMezonLightClientFromStorage,
  sendMezonLightDMWithRefreshFallback,
  useGetDmChannel,
  useCreateDmChannelMutation,
} from '@/services'
import { useMezonLight } from '@/providers'
import { userAtom } from '@/store'
import { detectBrowserTimezone, resolveUserTimezone } from '@/lib/timezone'
import { isTrialLessonRescheduleEligible } from '@/lib/trial-lesson-cancellation'

import { ECurrency, ROUTES } from '@mezon-tutors/shared'

import TutorsPagination from '@/views/main/tutors/components/TutorsPagination'

import BookingRequestsMetrics from './components/BookingRequestsMetrics'
import BookingRequestsTable from './components/BookingRequestsTable'
import {
  CancelLessonDialog,
  type TrialCancelLessonTarget,
} from '@/views/main/my-lessons/components/CancelLessonDialog'
import {
  RescheduleLessonDialog,
  type TutorRescheduleLessonTarget,
} from './components/RescheduleLessonDialog'

import type { TutorBookingRequestUiStatus } from '@/lib/trial-booking-status'

dayjs.extend(utc)
dayjs.extend(timezone)

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

function bookingToCancelTarget(
  item: TrialLessonBookingRequestItem,
  locale: string,
  timezoneName: string,
): TrialCancelLessonTarget {
  const start = dayjs(item.startAt).tz(timezoneName).locale(locale)
  const end = start.add(item.durationMinutes, 'minute')

  return {
    id: item.id,
    source: 'trial',
    peerName: item.studentName,
    peerAvatarUrl: item.studentAvatarUrl,
    dateLabel: start.isValid() ? start.format('ddd, MMM DD') : '—',
    timeLabel: start.isValid() ? `${start.format('HH:mm')} - ${end.format('HH:mm')}` : '—',
    subject: 'Trial lesson',
    startAt: item.startAt,
    grossAmount: item.grossAmount > 0 ? item.grossAmount : undefined,
    currency: ECurrency.VND,
  }
}

function bookingToRescheduleTarget(
  item: TrialLessonBookingRequestItem,
  locale: string,
  timezoneName: string,
): TutorRescheduleLessonTarget {
  const start = dayjs(item.startAt).tz(timezoneName).locale(locale)
  const end = start.add(item.durationMinutes, 'minute')

  return {
    id: item.id,
    studentName: item.studentName,
    studentAvatarUrl: item.studentAvatarUrl,
    dateLabel: start.isValid() ? start.format('ddd, MMM DD') : '—',
    timeLabel: start.isValid() ? `${start.format('HH:mm')} - ${end.format('HH:mm')}` : '—',
    subject: 'Trial lesson',
  }
}

export default function BookingRequestsView() {
  const t = useTranslations('Dashboard.bookingRequests')
  const tReschedule = useTranslations('Dashboard.bookingRequests.reschedule')
  const tCancel = useTranslations('Dashboard.bookingRequests.cancellation')

  const router = useRouter()
  const queryClient = useQueryClient()
  const locale = useLocale()

  const currentUser = useAtomValue(userAtom)
  const senderId = currentUser?.id ?? ''
  const senderMezonUserId = currentUser?.mezonUserId ?? ''

  const userTimezone = resolveUserTimezone(
    currentUser?.timezone,
    detectBrowserTimezone(),
  )

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TrialLessonBookingRequestStatusFilter>(
    'all',
  )
  const [page, setPage] = useState(1)

  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false)
  const [rescheduleTarget, setRescheduleTarget] = useState<TutorRescheduleLessonTarget | null>(
    null,
  )
  const [rescheduleBooking, setRescheduleBooking] = useState<TrialLessonBookingRequestItem | null>(
    null,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<TrialCancelLessonTarget | null>(null)
  const [cancelBooking, setCancelBooking] = useState<TrialLessonBookingRequestItem | null>(null)
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false)

  const tutorRescheduleMutation = useTutorRescheduleRequestMutation()
  const tutorCancelMutation = useTutorCancelTrialLessonMutation()

  const recipientId =
    cancelBooking?.studentId ?? rescheduleBooking?.studentId ?? ''
  const recipientMezonUserId =
    cancelBooking?.studentMezonUserId ?? rescheduleBooking?.studentMezonUserId ?? ''

  const { refetch: refetchDmChannel } = useGetDmChannel(senderId, recipientId, false)
  const createDmChannelMutation = useCreateDmChannelMutation()
  const { lightClient, setLightClient } = useMezonLight()

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

  const handleCancel = (item: TrialLessonBookingRequestItem) => {
    if (!isTrialLessonRescheduleEligible(item.startAt)) {
      toast.error(tCancel('within12Hours'))
      return
    }
    setCancelBooking(item)
    setCancelTarget(bookingToCancelTarget(item, locale, userTimezone))
    setIsCancelDialogOpen(true)
  }

  const handleConfirmCancel = async (reason: string, message?: string) => {
    if (!cancelBooking) return

    if (message?.trim()) {
      if (!senderId || !senderMezonUserId || !recipientMezonUserId || !recipientId) {
        toast.error(tCancel('messageMissingUser'))
      } else {
        try {
          let client = lightClient
          if (!client) {
            client = await restoreMezonLightClientFromStorage()
            if (!client) {
              throw new Error('Cannot restore Mezon client. Please login again.')
            }
            setLightClient(client)
          }

          const isSessionExpired = await client.isSessionExpired()
          if (isSessionExpired) {
            await refreshMezonLightSession(client)
            await persistMezonLightSession(client)
          }

          let channelId = (await refetchDmChannel()).data?.channelId
          if (!channelId) {
            const dmChannel = await createMezonLightDM(client, recipientMezonUserId)
            channelId = dmChannel?.channel_id
            if (!channelId) {
              throw new Error('Could not create DM channel.')
            }

            await createDmChannelMutation.mutateAsync({
              senderId,
              recipientId,
              channelId,
            })
          }

          await sendMezonLightDMWithRefreshFallback(client, channelId, message.trim())
          toast.success(tCancel('messageSent'))
        } catch (error) {
          console.error('DM Error:', error)
          toast.error(tCancel('messageFailed'))
        }
      }
    }

    try {
      setIsCancelSubmitting(true)
      await tutorCancelMutation.mutateAsync({
        bookingId: cancelBooking.id,
        payload: { reason, message: message?.trim() },
      })

      await queryClient.invalidateQueries({
        queryKey: ['trial-lesson-booking-my-requests'],
      })

      toast.success(tCancel('success'))
      setIsCancelDialogOpen(false)
      setCancelTarget(null)
      setCancelBooking(null)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : tCancel('failed'))
    } finally {
      setIsCancelSubmitting(false)
    }
  }

  const handleReschedule = (item: TrialLessonBookingRequestItem) => {
    if (item.rescheduleRequestSubmitted) {
      toast.error(tReschedule('alreadyRequested'))
      return
    }
    if (!isTrialLessonRescheduleEligible(item.startAt)) {
      toast.error(tReschedule('within12Hours'))
      return
    }
    setRescheduleBooking(item)
    setRescheduleTarget(bookingToRescheduleTarget(item, locale, userTimezone))
    setIsRescheduleDialogOpen(true)
  }

  const handleConfirmReschedule = async (reason: string, message?: string) => {
    if (!rescheduleBooking) return

    try {
      setIsSubmitting(true)

      await tutorRescheduleMutation.mutateAsync({
        bookingId: rescheduleBooking.id,
        payload: { reason, message: message?.trim() || undefined },
      })

      if (message?.trim()) {
        if (!senderId || !senderMezonUserId || !recipientMezonUserId || !recipientId) {
          toast.error(tReschedule('messageMissingUser'))
        } else {
          try {
            let client = lightClient
            if (!client) {
              client = await restoreMezonLightClientFromStorage()
              if (!client) {
                throw new Error('Cannot restore Mezon client. Please login again.')
              }
              setLightClient(client)
            }

            const isSessionExpired = await client.isSessionExpired()
            if (isSessionExpired) {
              await refreshMezonLightSession(client)
              await persistMezonLightSession(client)
            }

            let channelId = (await refetchDmChannel()).data?.channelId
            if (!channelId) {
              const dmChannel = await createMezonLightDM(client, recipientMezonUserId)
              channelId = dmChannel?.channel_id
              if (!channelId) {
                throw new Error('Could not create DM channel.')
              }

              await createDmChannelMutation.mutateAsync({
                senderId,
                recipientId,
                channelId,
              })
            }

            await sendMezonLightDMWithRefreshFallback(client, channelId, message.trim())
            toast.success(tReschedule('messageSent'))
          } catch (error) {
            console.error('DM Error:', error)
            toast.error(tReschedule('messageFailed'))
          }
        }
      }

      await queryClient.invalidateQueries({
        queryKey: ['trial-lesson-booking-my-requests'],
      })

      toast.success(tReschedule('success'))
      setIsRescheduleDialogOpen(false)
      setRescheduleTarget(null)
      setRescheduleBooking(null)
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : tReschedule('failed'),
      )
    } finally {
      setIsSubmitting(false)
    }
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
        onCancel={handleCancel}
      />

      <div className="pt-6">
        <TutorsPagination
          page={page}
          totalPages={totalPages}
          isFetching={isFetching}
          onPageChangeAction={setPage}
        />
      </div>

      <RescheduleLessonDialog
        isOpen={isRescheduleDialogOpen}
        onClose={() => {
          setIsRescheduleDialogOpen(false)
          setRescheduleTarget(null)
          setRescheduleBooking(null)
        }}
        onConfirm={handleConfirmReschedule}
        lesson={rescheduleTarget}
        isLoading={isSubmitting}
      />

      <CancelLessonDialog
        isOpen={isCancelDialogOpen}
        onClose={() => {
          setIsCancelDialogOpen(false)
          setCancelTarget(null)
          setCancelBooking(null)
        }}
        onConfirm={handleConfirmCancel}
        lesson={cancelTarget}
        isLoading={isCancelSubmitting}
      />
    </div>
  )
}
