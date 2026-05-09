import MyLessonsPage from '@/views/main/my-lessons';
import { DashboardLayout } from '@/components/dashboard';

export default function Page() {
  return (
    <DashboardLayout>
      <MyLessonsPage />
    </DashboardLayout>
  );
}
