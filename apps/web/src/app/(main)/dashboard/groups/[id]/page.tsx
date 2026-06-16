import { GroupDetailView } from '@/views/main/groups/GroupDetailView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <GroupDetailView groupId={id} />;
}
