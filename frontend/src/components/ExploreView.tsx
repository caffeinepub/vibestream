import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useGetTrendingPosts, useSearchUsers, useSearchPosts } from '../hooks/useQueries';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { Post, UserProfile } from '../backend';
import { MediaType } from '../backend';
import { Skeleton } from '@/components/ui/skeleton';

interface ExploreViewProps {
  onNavigateToProfile: (userId: string) => void;
  onNavigateToFeed: (postIndex?: number) => void;
}

function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ExploreView({ onNavigateToProfile, onNavigateToFeed }: ExploreViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 400);
  const isSearching = debouncedQuery.trim().length > 0;

  const { data: trendingPosts, isLoading: trendingLoading } = useGetTrendingPosts(0, 30);

  return (
    <div className="h-dvh bg-vibe-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-12 pb-3">
        <h1 className="font-display text-2xl font-bold text-white mb-4">Explore</h1>
        {/* Search bar */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users and posts..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-vibe-purple transition-colors text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full glass-card flex items-center justify-center"
            >
              <X size={12} color="white" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        {isSearching ? (
          <SearchResults
            query={debouncedQuery}
            onNavigateToProfile={onNavigateToProfile}
            onNavigateToFeed={onNavigateToFeed}
          />
        ) : (
          <TrendingSection
            posts={trendingPosts || []}
            isLoading={trendingLoading}
            onNavigateToFeed={onNavigateToFeed}
          />
        )}
      </div>
    </div>
  );
}

function TrendingSection({
  posts,
  isLoading,
  onNavigateToFeed,
}: {
  posts: Post[];
  isLoading: boolean;
  onNavigateToFeed: (postIndex?: number) => void;
}) {
  return (
    <div className="px-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🔥</span>
        <h2 className="font-display font-semibold text-white">Trending</h2>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16] rounded-xl skeleton-shimmer" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-4xl">🎬</span>
          <p className="text-muted-foreground text-sm text-center">No trending posts yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {posts.map((post, index) => (
            <PostThumbnail
              key={post.id.toString()}
              post={post}
              onClick={() => onNavigateToFeed(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PostThumbnail({ post, onClick }: { post: Post; onClick: () => void }) {
  const isVideo = post.mediaType === MediaType.video;
  const url = post.mediaBlob.getDirectURL();

  return (
    <button
      onClick={onClick}
      className="relative aspect-[9/16] rounded-xl overflow-hidden bg-secondary group"
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
      <div className="absolute inset-0 bg-black/20 group-active:bg-black/40 transition-colors" />
      {isVideo && (
        <div className="absolute top-1.5 left-1.5">
          <div className="w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="#8A2BE2">
          <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
        </svg>
        <span className="text-white text-xs font-medium">{formatCount(Number(post.likesCount))}</span>
      </div>
    </button>
  );
}

function SearchResults({
  query,
  onNavigateToProfile,
  onNavigateToFeed,
}: {
  query: string;
  onNavigateToProfile: (userId: string) => void;
  onNavigateToFeed: (postIndex?: number) => void;
}) {
  const { data: users, isLoading: usersLoading } = useSearchUsers(query);
  const { data: posts, isLoading: postsLoading } = useSearchPosts(query);

  return (
    <div className="px-5">
      <Tabs defaultValue="users">
        <TabsList className="w-full mb-4 bg-secondary rounded-2xl p-1">
          <TabsTrigger
            value="users"
            className="flex-1 rounded-xl data-[state=active]:bg-vibe-purple data-[state=active]:text-white"
          >
            Users {users && users.length > 0 && `(${users.length})`}
          </TabsTrigger>
          <TabsTrigger
            value="posts"
            className="flex-1 rounded-xl data-[state=active]:bg-vibe-purple data-[state=active]:text-white"
          >
            Posts {posts && posts.length > 0 && `(${posts.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {usersLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <Skeleton className="w-12 h-12 rounded-full skeleton-shimmer" />
                  <div className="flex-1 flex flex-col gap-1">
                    <Skeleton className="h-4 w-32 skeleton-shimmer rounded" />
                    <Skeleton className="h-3 w-48 skeleton-shimmer rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : !users || users.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <span className="text-3xl">👤</span>
              <p className="text-muted-foreground text-sm">No users found for &quot;{query}&quot;</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {users.map((user) => (
                <UserResultItem
                  key={user.principal.toString()}
                  user={user}
                  onNavigate={onNavigateToProfile}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="posts">
          {postsLoading ? (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[9/16] rounded-xl skeleton-shimmer" />
              ))}
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <span className="text-3xl">🔍</span>
              <p className="text-muted-foreground text-sm">No posts found for &quot;{query}&quot;</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post, index) => (
                <PostThumbnail
                  key={post.id.toString()}
                  post={post}
                  onClick={() => onNavigateToFeed(index)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UserResultItem({ user, onNavigate }: { user: UserProfile; onNavigate: (id: string) => void }) {
  const avatarUrl = user.profilePicture
    ? user.profilePicture.getDirectURL()
    : '/assets/generated/default-avatar.dim_256x256.png';

  return (
    <button
      onClick={() => onNavigate(user.principal.toString())}
      className="flex items-center gap-3 p-3 rounded-2xl glass-card hover:bg-white/5 transition-colors text-left w-full"
    >
      <img
        src={avatarUrl}
        alt={user.username}
        className="w-12 h-12 rounded-full object-cover border-2"
        style={{ borderColor: 'rgba(138, 43, 226, 0.4)' }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">@{user.username}</p>
        {user.bio && (
          <p className="text-muted-foreground text-xs truncate mt-0.5">{user.bio}</p>
        )}
        <p className="text-xs mt-0.5" style={{ color: '#8A2BE2' }}>
          {Number(user.followersCount).toLocaleString()} followers
        </p>
      </div>
    </button>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
