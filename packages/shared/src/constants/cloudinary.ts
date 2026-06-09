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
};

export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_FILE_SIZE_MB = 15;

/** Sentinel in become-tutor draft when document already exists on server (re-edit flow). */
export const EXISTING_SECURE_FILE = '__existing__' as const;