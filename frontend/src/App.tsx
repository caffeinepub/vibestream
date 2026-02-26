import { useState } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { useGetCallerUserProfile } from './hooks/useQueries';
import LoginScreen from './pages/LoginScreen';
import ProfileSetupModal from './components/ProfileSetupModal';
import MainLayout from './components/MainLayout';
import { Toaster } from '@/components/ui/sonner';

type ActiveTab = 'feed' | 'explore' | 'upload' | 'profile';

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const [activeTab, setActiveTab] = useState<ActiveTab>('feed');
  const [profilePostIndex, setProfilePostIndex] = useState<number>(0);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  const handleLogout = async () => {
    queryClient.clear();
  };

  const navigateToProfile = (userId: string) => {
    setViewingUserId(userId);
    setActiveTab('profile');
  };

  const navigateToFeed = (postIndex?: number) => {
    if (postIndex !== undefined) setProfilePostIndex(postIndex);
    setActiveTab('feed');
  };

  // Initializing — show splash
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-dvh bg-vibe-black">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-3xl blur-xl opacity-60 animate-pulse"
              style={{ background: 'linear-gradient(135deg, #8A2BE2, #00FFFF)' }}
            />
            <img
              src="/assets/generated/vibestream-logo.dim_512x512.png"
              alt="VibeStream"
              className="relative w-20 h-20 rounded-3xl"
            />
          </div>
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-vibe-purple animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-vibe-purple animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-vibe-purple animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated — show login screen
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen />
        <Toaster theme="dark" position="top-center" />
      </>
    );
  }

  // Authenticated but profile not yet loaded — show loading
  if (profileLoading && !isFetched) {
    return (
      <div className="flex items-center justify-center h-dvh bg-vibe-black">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-3xl blur-xl opacity-40"
              style={{ background: 'linear-gradient(135deg, #8A2BE2, #00FFFF)' }}
            />
            <img
              src="/assets/generated/vibestream-logo.dim_512x512.png"
              alt="VibeStream"
              className="relative w-16 h-16 rounded-3xl"
            />
          </div>
          <p className="text-muted-foreground text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Authenticated but no profile — show inline profile setup (full screen, not a modal overlay)
  if (showProfileSetup) {
    return (
      <>
        <ProfileSetupModal />
        <Toaster theme="dark" position="top-center" />
      </>
    );
  }

  // Fully authenticated with profile — show main app
  return (
    <>
      <MainLayout
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'profile') setViewingUserId(null);
          setActiveTab(tab as ActiveTab);
        }}
        viewingUserId={viewingUserId}
        onNavigateToProfile={navigateToProfile}
        onNavigateToFeed={navigateToFeed}
        onLogout={handleLogout}
        profilePostIndex={profilePostIndex}
        currentUserProfile={userProfile}
      />
      <Toaster theme="dark" position="top-center" />
    </>
  );
}
