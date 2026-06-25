import { DEFAULT_INTRO_VIDEO_MAX_DURATION_SECONDS } from './app-settings';

export const BASIC_FOLDER = 'mezon-tutor';

export const CLOUDINARY_FOLDER = {
  TUTOR_AVATAR: `${BASIC_FOLDER}/tutor-avatar`,
  TUTOR_IDENTITY: `${BASIC_FOLDER}/tutor-identity`,
  TUTOR_CERTIFICATE: `${BASIC_FOLDER}/tutor-certificate`,
  TUTOR_DIPLOMA: `${BASIC_FOLDER}/tutor-diploma`,
  TUTOR_CV: `${BASIC_FOLDER}/tutor-cv`,
  ADMIN_PAYMENTS: `${BASIC_FOLDER}/admin-payments`,
  LESSON_COMPLAINT: `${BASIC_FOLDER}/lesson-complaint`,
  EVENT: `${BASIC_FOLDER}/events`,
  BLOG: `${BASIC_FOLDER}/blogs`,
  TUTOR_INTRO_VIDEO: `${BASIC_FOLDER}/tutor-intro-video`,
};

export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_FILE_SIZE_MB = 15;
export const MAX_INTRO_VIDEO_SIZE_MB = 100;
export const MAX_INTRO_VIDEO_DURATION_SECONDS = DEFAULT_INTRO_VIDEO_MAX_DURATION_SECONDS;
export const ACCEPT_INTRO_VIDEO_TYPES = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';

/** Sentinel in become-tutor draft when document already exists on server (re-edit flow). */
export const EXISTING_SECURE_FILE = '__existing__' as const;