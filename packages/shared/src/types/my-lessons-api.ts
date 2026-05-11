export type MyLessonApiCategory = string

export type MyLessonApiStatus = 'upcoming' | 'completed'

export type MyLessonWeekDayApiItem = {
  short_label: string
  date_label: string
}

export type MyLessonApiItem = {
  id: string
  subject: string
  tutor_id: string
  tutor_name: string
  tutor_avatar: string
  tutor_mezon_user_id: string | null
  category: MyLessonApiCategory
  status: MyLessonApiStatus
  date_label: string
  time_label: string
  day_index: number
  start_hour: number
  end_hour: number
}

export type MyLessonTutorApiItem = {
  id: string
  name: string
  avatar: string
  teaches: string
  availability: string
  completed_lessons: number
  next_lesson_label: string
  rating_average: number
  review_count: number
}

export type MyLessonsApiResponse = {
  calendar_title: string
  week_days: MyLessonWeekDayApiItem[]
  week_hours: number[]
  current_day_index?: number
  current_hour?: number
  calendar_lessons: MyLessonApiItem[]
  upcoming_lessons: MyLessonApiItem[]
  previous_lessons: MyLessonApiItem[]
  tutors: MyLessonTutorApiItem[]
}
