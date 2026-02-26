import type { UserProfile } from '../backend';
import BottomNav from './BottomNav';
import FeedView from './FeedView';
import ExploreView from './ExploreView';
import UploadView from './UploadView';
import ProfileView from './ProfileView';

type ActiveTab = 'feed' | 'explore' | 'upload' | 'profile';

interface MainLayoutProps {
  activeTab: ActiveTab;
  onTabChange: (tab: string) => void;
  viewingUserId: string | null;
  onNavigateToProfile: (userId: string) => void;
  onNavigateToFeed: (postIndex?: number) => void;
  onLogout: () => void;
  profilePostIndex: number;
  currentUserProfile: UserProfile | null | undefined;
}

export default function MainLayout({
  activeTab,
  onTabChange,
  viewingUserId,
  onNavigateToProfile,
  onNavigateToFeed,
  onLogout,
  currentUserProfile,
}: MainLayoutProps) {
  return (
    <div className="relative h-dvh bg-vibe-black overflow-hidden">
      {/* Main content area */}
      <div className="h-full">
        {activeTab === 'feed' && (
          <FeedView onNavigateToProfile={onNavigateToProfile} />
        )}
        {activeTab === 'explore' && (
          <ExploreView
            onNavigateToProfile={onNavigateToProfile}
            onNavigateToFeed={onNavigateToFeed}
          />
        )}
        {activeTab === 'upload' && (
          <UploadView onUploadSuccess={() => onTabChange('feed')} />
        )}
        {activeTab === 'profile' && (
          <ProfileView
            userId={viewingUserId}
            currentUserProfile={currentUserProfile}
            onNavigateToProfile={onNavigateToProfile}
            onNavigateToFeed={onNavigateToFeed}
            onLogout={onLogout}
          />
        )}
      </div>

      {/* Bottom navigation */}
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
