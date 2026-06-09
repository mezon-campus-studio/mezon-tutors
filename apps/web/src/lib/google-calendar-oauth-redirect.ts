import { googleCalendarApi } from '@/services/google-calendar/google-calendar.api';

export async function redirectToGoogleCalendarOAuth() {
  const returnTo = window.location.pathname + window.location.search || '/';
  const { url } = await googleCalendarApi.getOAuthAuthorizeUrl(returnTo);
  window.location.href = url;
}
