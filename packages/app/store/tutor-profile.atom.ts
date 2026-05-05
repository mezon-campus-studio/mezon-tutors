import { atomWithStorage, RESET } from 'jotai/utils'
import { atom } from 'jotai'
import {
  DAY_KEYS,
  TutorProfileAboutState,
  TutorProfilePhotoState,
  TutorProfileCertificationState,
  TutorProfileVideoState,
  TutorProfileAvailabilityState,
  TimeSlot,
  ECurrency,
} from '@mezon-tutors/shared'

export const defaultAboutState: TutorProfileAboutState = {
  firstName: '',
  lastName: '',
  email: '',
  country: '',
  phone: '',
  subject: '',
  languages: '',
  proficiencies: '',
}

export const defaultPhotoState: TutorProfilePhotoState = {
  photo: {
    dataUrl: null,
    uploadedUrl: null,
    publicId: null,
    fileName: '',
  },
  identity: {
    dataUrl: null,
    uploadedUrl: null,
    publicId: null,
    fileName: '',
  },
  headline: '',
  motivate: '',
  introduce: '',
}

export const defaultCertificationState: TutorProfileCertificationState = {
  teachingCertificate: {
    name: '',
    year: '',
    file: { dataUrl: null, uploadedUrl: null, publicId: null, fileName: '' },
  },
  higherEducation: {
    university: '',
    degree: '',
    specialization: '',
    file: { dataUrl: null, uploadedUrl: null, publicId: null, fileName: '' },
  },
}

export const defaultSlot: TimeSlot = {
  startTime: '09:00',
  endTime: '17:00',
}

export const defaultVideoState: TutorProfileVideoState = {
  videoLink: '',
  videoId: null,
}

export const defaultAvailabilityState: TutorProfileAvailabilityState = {
  selectedDayIndex: 0,
  hourlyRate: '',
  currency: ECurrency.USD,
  slotsByDay: Object.fromEntries(DAY_KEYS.map((d) => [d, []])),
}

function stripPhotoDataUrlsForStorage(state: TutorProfilePhotoState): TutorProfilePhotoState {
  return {
    ...state,
    photo: { ...state.photo, dataUrl: null },
    identity: { ...state.identity, dataUrl: null },
  }
}

function stripCertificationDataUrlsForStorage(
  state: TutorProfileCertificationState
): TutorProfileCertificationState {
  return {
    ...state,
    teachingCertificate: {
      ...state.teachingCertificate,
      file: { ...state.teachingCertificate.file, dataUrl: null },
    },
    higherEducation: {
      ...state.higherEducation,
      file: { ...state.higherEducation.file, dataUrl: null },
    },
  }
}

function createStrippingLocalStorage<T>(
  strip: (value: T) => T
): {
  getItem: (key: string, initialValue: T) => T
  setItem: (key: string, value: T) => void
  removeItem: (key: string) => void
} {
  return {
    getItem: (key, initialValue) => {
      if (typeof localStorage === 'undefined') return initialValue
      try {
        const raw = localStorage.getItem(key)
        if (raw === null) return initialValue
        return JSON.parse(raw) as T
      } catch {
        return initialValue
      }
    },
    setItem: (key, value) => {
      if (typeof localStorage === 'undefined') return
      try {
        localStorage.setItem(key, JSON.stringify(strip(value)))
      } catch {
        /* quota / private mode */
      }
    },
    removeItem: (key) => {
      if (typeof localStorage === 'undefined') return
      localStorage.removeItem(key)
    },
  }
}

export const tutorProfileAboutAtom = atomWithStorage<TutorProfileAboutState>(
  'tutorProfile.about',
  defaultAboutState
)
export const tutorProfilePhotoAtom = atomWithStorage<TutorProfilePhotoState>(
  'tutorProfile.photo',
  defaultPhotoState,
  createStrippingLocalStorage(stripPhotoDataUrlsForStorage)
)
export const tutorProfileCertificationAtom = atomWithStorage<TutorProfileCertificationState>(
  'tutorProfile.certification',
  defaultCertificationState,
  createStrippingLocalStorage(stripCertificationDataUrlsForStorage)
)
export const tutorProfileVideoAtom = atomWithStorage<TutorProfileVideoState>(
  'tutorProfile.video',
  defaultVideoState
)
export const tutorProfileAvailabilityAtom = atomWithStorage<TutorProfileAvailabilityState>(
  'tutorProfile.availability',
  defaultAvailabilityState
)

export type TutorProfileStepId = 1 | 2 | 3 | 4 | 5

export type TutorProfileStepStatus = 'idle' | 'in_progress' | 'completed'

export const tutorProfileCurrentStepAtom = atomWithStorage<TutorProfileStepId>(
  'tutorProfile.currentStep',
  1
)

export const tutorProfileStepStatusesAtom = atomWithStorage<
  Record<TutorProfileStepId, TutorProfileStepStatus>
>('tutorProfile.stepStatuses', {
  1: 'in_progress',
  2: 'idle',
  3: 'idle',
  4: 'idle',
  5: 'idle',
} as Record<TutorProfileStepId, TutorProfileStepStatus>)

export const tutorProfileLastSavedAtAtom = atomWithStorage<string | null>(
  'tutorProfile.lastSavedAt',
  null
)

export const markStepCompletedAtom = atom(null, (get, set, stepId: TutorProfileStepId) => {
  const statuses = get(tutorProfileStepStatusesAtom)
  const next: Record<TutorProfileStepId, TutorProfileStepStatus> = {
    ...statuses,
    [stepId]: 'completed',
  }
  const nextStep = (stepId + 1) as TutorProfileStepId

  if (nextStep <= 5) {
    next[nextStep] = 'in_progress'
    set(tutorProfileCurrentStepAtom, nextStep)
  }

  set(tutorProfileStepStatusesAtom, next)
})

export const resetTutorProfileAfterSubmitAtom = atom(null, (_, set) => {
  set(tutorProfileAboutAtom, RESET)
  set(tutorProfilePhotoAtom, RESET)
  set(tutorProfileCertificationAtom, RESET)
  set(tutorProfileVideoAtom, RESET)
  set(tutorProfileAvailabilityAtom, RESET)
  set(tutorProfileCurrentStepAtom, RESET)
  set(tutorProfileStepStatusesAtom, RESET)
  set(tutorProfileLastSavedAtAtom, RESET)
})
