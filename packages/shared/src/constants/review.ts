export const REVIEW_VALIDATION = {
  MIN_RATING: 1,
  MAX_RATING: 5,
  MAX_COMMENT_LENGTH: 500,
} as const;

export const REVIEW_STAR_SIZE = {
  SMALL: 14,
  MEDIUM: 24,
  LARGE: 32,
} as const;

export const REVIEW_STAR_GAP = {
  SMALL: 2,
  MEDIUM: 4,
} as const;

export const REVIEW_MODAL_CONFIG = {
  MAX_WIDTH: 600,
  TEXTAREA_MIN_HEIGHT: 150,
} as const;

export const REVIEW_DISPLAY_CONFIG = {
  INITIAL_VISIBLE_COUNT: 6,
  COLUMNS: 2,
  LOAD_MORE_COUNT: 10,
  COMMENT_PREVIEW_LENGTH: 150,
  CARD_MIN_HEIGHT: 180,
} as const;

export const REVIEW_AVATAR = {
  DEFAULT_URL: 'https://www.svgrepo.com/show/452030/avatar-default.svg',
  SIZE: 48,
} as const;
