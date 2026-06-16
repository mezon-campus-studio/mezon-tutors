import { StudyGroupsView } from '@/views/main/groups/StudyGroupsView';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Study Groups | Mezon Tutors',
  description: 'Manage your collaborative circles and book new focused learning sprints.',
};

export default function StudyGroupsPage() {
  return <StudyGroupsView />;
}
