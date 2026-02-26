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
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
    isError: profileError,
    refetch: refetchProfile,
  } = useGetCallerUserProfile();

  const [activeTab, setActiveTab] = useState<ActiveTab>('feed');
  const [profilePostIndex, setProfilePostIndex] = useState<number>(0);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  // Show profile setup only when: authenticated, not loading, query has completed, and no profile exists
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null && !profileError;

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

  // 1. Not authenticated — show login screen immediately
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen />
        <Toaster theme="dark" position="top-center" />
      </>
    );
  }

  // 2. Authenticated but no profile — show inline profile setup (full screen)
  if (showProfileSetup) {
    return (
      <>
        <ProfileSetupModal />
        <Toaster theme="dark" position="top-center" />
      </>
    );
  }

  // 3. Profile query failed — retry silently, show main layout if we have data
  if (profileError && !isFetched) {
    refetchProfile();
  }

  // 4. Fully authenticated with profile — show main app
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
