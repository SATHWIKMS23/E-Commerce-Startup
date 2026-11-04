import { ProfileDashboard } from '@/features/auth/profile/ui/ProfileDashboard';

export default function ProfilePage() {
  return (
    <main className="py-8 bg-zinc-950/20 min-h-[calc(100dvh-64px)]">
      <ProfileDashboard />
    </main>
  );
}
