import { InviteLandingView } from '@/views/main/groups/InviteLandingView';

interface PageProps {
  params: Promise<{ inviteId: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { inviteId } = await params;

  return <InviteLandingView inviteId={inviteId} />;
}
