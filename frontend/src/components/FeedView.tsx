import { useState, useRef, useEffect, useCallback } from 'react';
import { useGetFeed } from '../hooks/useQueries';
import VideoPostCard from './VideoPostCard';
import { Skeleton } from '@/components/ui/skeleton';

interface FeedViewProps {
  onNavigateToProfile: (userId: string) => void;
  startIndex?: number;
}

export default function FeedView({ onNavigateToProfile, startIndex = 0 }: FeedViewProps) {
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: posts, isLoading } = useGetFeed(0, 20);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    setActiveIndex(newIndex);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Scroll to startIndex on mount
  useEffect(() => {
    if (startIndex > 0 && containerRef.current && posts && posts.length > startIndex) {
      const container = containerRef.current;
      container.scrollTop = startIndex * container.clientHeight;
    }
  }, [startIndex, posts]);

  if (isLoading) {
    return (
      <div className="h-dvh bg-vibe-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-full h-dvh absolute inset-0 skeleton-shimmer" />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-2 border-vibe-purple/30 border-t-vibe-purple rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Loading your feed...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="h-dvh bg-vibe-black flex flex-col items-center justify-center gap-6 px-8 pb-20">
        <div className="text-6xl">🎬</div>
        <div className="text-center">
          <h3 className="font-display text-xl font-semibold text-white mb-2">No posts yet</h3>
          <p className="text-muted-foreground text-sm">
            Be the first to share your vibe! Upload a video or photo to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="feed-container pb-16"
      style={{ paddingBottom: '64px' }}
    >
      {posts.map((post, index) => (
        <div key={post.id.toString()} className="feed-item">
          <VideoPostCard
            post={post}
            isActive={index === activeIndex}
            onNavigateToProfile={onNavigateToProfile}
          />
        </div>
      ))}
    </div>
  );
}
