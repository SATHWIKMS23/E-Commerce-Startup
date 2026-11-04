import { NotificationPage } from '@/features/notifications/ui/NotificationPage';

export default function NotificationsRoute() {
  return (
    <main className="bg-zinc-950/20 min-h-[calc(100dvh-64px)] flex flex-col justify-between">
      <NotificationPage />
    </main>
  );
}
