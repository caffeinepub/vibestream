import { useState } from 'react';
import { Settings, LogOut, Grid, Heart } from 'lucide-react';
import {
  useGetUserProfile,
  useGetPostsByUser,
  useIsFollowing,
  useFollowUser,
  useUnfollowUser,
} from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import type { UserProfile, Post } from '../backend';
import { MediaType } from '../backend';
import EditProfileModal from './EditProfileModal';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface ProfileViewProps {
  userId: string | null;
  currentUserProfile: UserProfile | null | undefined;
  onNavigateToProfile: (userId: string) => void;
  onNavigateToFeed: (postIndex?: number) => void;
  onLogout: () => void;
}

export default function ProfileView({
  userId,
  currentUserProfile,
  onNavigateToProfile: _onNavigateToProfile,
  onNavigateToFeed,
  onLogout,
}: ProfileViewProps) {
  const { identity, clear } = useInternetIdentity();
  const [showEditModal, setShowEditModal] = useState(false);

  const currentPrincipal = identity?.getPrincipal().toString();
  const targetUserId = userId || currentPrincipal || null;
  const isOwnProfile = !userId || userId === currentPrincipal;

  const { data: viewedProfile, isLoading: profileLoading } = useGetUserProfile(
    isOwnProfile ? null : targetUserId
  );
  const profile = isOwnProfile ? currentUserProfile : viewedProfile;

  const { data: posts, isLoading: postsLoading } = useGetPostsByUser(targetUserId, 0, 30);
  const { data: isFollowing } = useIsFollowing(isOwnProfile ? null : targetUserId);
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const handleFollowToggle = async () => {
    if (!targetUserId) return;
    try {
      if (isFollowing) {
        await unfollowUser.mutateAsync(targetUserId);
        toast.success('Unfollowed');
      } else {
        await followUser.mutateAsync(targetUserId);
        toast.success('Following!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || 'Action failed');
    }
  };

  const handleLogout = async () => {
    await clear();
    onLogout();
  };

  const avatarUrl = profile?.profilePicture
    ? profile.profilePicture.getDirectURL()
    : '/assets/generated/default-avatar.dim_256x256.png';

  if (profileLoading && !isOwnProfile) {
    return (
      <div className="h-dvh bg-vibe-black flex flex-col overflow-y-auto scrollbar-hide pb-20">
        <div className="px-5 pt-12 pb-4">
          <Skeleton className="w-24 h-24 rounded-full skeleton-shimmer mx-auto" />
          <Skeleton className="h-5 w-32 skeleton-shimmer rounded mx-auto mt-3" />
          <Skeleton className="h-4 w-48 skeleton-shimmer rounded mx-auto mt-2" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-dvh bg-vibe-black flex flex-col overflow-y-auto scrollbar-hide pb-20">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-12 pb-2">
          <h1 className="font-display text-xl font-bold text-white">
            {isOwnProfile ? 'My Profile' : `@${profile?.username || 'Profile'}`}
          </h1>
          {isOwnProfile && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="w-9 h-9 rounded-full glass-card flex items-center justify-center"
              >
                <Settings size={18} color="white" />
              </button>
              <button
                onClick={handleLogout}
                className="w-9 h-9 rounded-full glass-card flex items-center justify-center"
              >
                <LogOut size={18} color="#ff4444" />
              </button>
            </div>
          )}
        </div>

        {/* Profile info */}
        <div className="px-5 py-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <img
                src={avatarUrl}
                alt={profile?.username || 'User'}
                className="w-20 h-20 rounded-full object-cover border-2"
                style={{ borderColor: '#8A2BE2', boxShadow: '0 0 20px rgba(138, 43, 226, 0.3)' }}
              />
            </div>

            {/* Stats */}
            <div className="flex-1">
              <h2 className="font-display font-bold text-white text-lg">
                @{profile?.username || 'Unknown'}
              </h2>
              {profile?.bio && (
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{profile.bio}</p>
              )}
              <div className="flex gap-4 mt-3">
                <StatItem value={Number(profile?.postsCount || 0)} label="Posts" />
                <StatItem value={Number(profile?.followersCount || 0)} label="Followers" />
                <StatItem value={Number(profile?.followingCount || 0)} label="Following" />
              </div>
            </div>
          </div>

          {/* Total likes */}
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl glass-card w-fit">
            <Heart size={14} fill="#8A2BE2" color="#8A2BE2" />
            <span className="text-sm font-medium text-white">
              {Number(profile?.totalLikes || 0).toLocaleString()} total likes
            </span>
          </div>

          {/* Follow/Edit button */}
          <div className="mt-4">
            {isOwnProfile ? (
              <button
                onClick={() => setShowEditModal(true)}
                className="w-full py-2.5 rounded-2xl font-medium text-sm text-white glass-card border border-white/20 transition-all duration-200 hover:border-vibe-purple"
              >
                Edit Profile
              </button>
            ) : (
              <button
                onClick={handleFollowToggle}
                disabled={followUser.isPending || unfollowUser.isPending}
                className="w-full py-2.5 rounded-2xl font-semibold text-sm transition-all duration-200 disabled:opacity-50"
                style={
                  isFollowing
                    ? {
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }
                    : { background: 'linear-gradient(135deg, #8A2BE2, #6a1fb5)', color: 'white' }
                }
              >
                {followUser.isPending || unfollowUser.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Loading...
                  </span>
                ) : isFollowing ? (
                  'Following ✓'
                ) : (
                  'Follow'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Posts grid */}
        <div className="px-5">
          <div className="flex items-center gap-2 mb-3">
            <Grid size={16} color="#8A2BE2" />
            <span className="font-display font-semibold text-white text-sm">Posts</span>
          </div>

          {postsLoading ? (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl skeleton-shimmer" />
              ))}
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <span className="text-4xl">📸</span>
              <p className="text-muted-foreground text-sm text-center">
                {isOwnProfile ? "You haven't posted anything yet" : 'No posts yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post, index) => (
                <ProfilePostThumbnail
                  key={post.id.toString()}
                  post={post}
                  onClick={() => onNavigateToFeed(index)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showEditModal && profile && (
        <EditProfileModal
          currentProfile={profile}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-display font-bold text-white text-base">{formatCount(value)}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

function ProfilePostThumbnail({ post, onClick }: { post: Post; onClick: () => void }) {
  const isVideo = post.mediaType === MediaType.video;
  const url = post.mediaBlob.getDirectURL();

  return (
    <button
      onClick={onClick}
      className="relative aspect-square rounded-xl overflow-hidden bg-secondary group"
    >
      {isVideo ? (
        <video
          src={url}
          className="w-full h-full object-cover"
          muted
          preload="metadata"
        />
      ) : (
        <img src={url} alt={post.caption} className="w-full h-full object-cover" loading="lazy" />
      )}
      <div className="absolute inset-0 bg-black/10 group-active:bg-black/30 transition-colors" />
      {isVideo && (
        <div className="absolute top-1.5 right-1.5">
          <div className="w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
