export function getAvatarGradient(source?: string | null, groupName?: string | null) {
  if (groupName) return 'from-indigo-500 to-cyan-500';
  return source === 'subscription' ? 'from-fuchsia-600 to-violet-600' : 'from-amber-500 to-orange-600';
}
