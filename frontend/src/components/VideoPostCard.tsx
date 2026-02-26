import { useState, useRef, useEffect, useCallback } from 'react';
import type { Post } from '../backend';
import { MediaType } from '../backend';
import PostOverlay from './PostOverlay';
import HeartAnimation from './HeartAnimation';
import CommentsPanel from './CommentsPanel';
import { useIsLiked, useLikePost, useUnlikePost } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

interface VideoPostCardProps {
  post: Post;
  isActive: boolean;
  onNavigateToProfile: (userId: string) => void;
}

export default function VideoPostCard({ post, isActive, onNavigateToProfile }: VideoPostCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showHeart, setShowHeart] = useState(false);
  const [heartKey, setHeartKey] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const lastTapRef = useRef<number>(0);
  const { identity } = useInternetIdentity();

  const { data: isLiked } = useIsLiked(post.id);
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();

  const mediaUrl = post.mediaBlob.getDirectURL();
  const isVideo = post.mediaType === MediaType.video;

  // Auto-play/pause based on active state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;

    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isActive, isVideo]);

  const handleLike = useCallback(async () => {
    if (!identity) return;
    try {
      if (isLiked) {
        await unlikePost.mutateAsync(post.id);
      } else {
        await likePost.mutateAsync(post.id);
      }
    } catch {
      // ignore duplicate like errors
    }
  }, [identity, isLiked, likePost, unlikePost, post.id]);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300) {
      // Double tap detected
      setShowHeart(true);
      setHeartKey((k) => k + 1);
      if (!isLiked && identity) {
        likePost.mutateAsync(post.id).catch(() => {});
      }
    }
    lastTapRef.current = now;
  }, [isLiked, identity, likePost, post.id]);

  const handleHeartDone = useCallback(() => {
    setShowHeart(false);
  }, []);

  return (
    <div
      className="relative w-full h-full bg-vibe-black overflow-hidden"
      onClick={handleDoubleTap}
    >
      {/* Media */}
      {isVideo ? (
        <video
          ref={videoRef}
          src={mediaUrl}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted={isMuted}
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={mediaUrl}
          alt={post.caption}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 40%, transparent 70%)',
        }}
      />

      {/* Heart animation */}
      {showHeart && (
        <HeartAnimation key={heartKey} onDone={handleHeartDone} />
      )}

      {/* Mute button for videos */}
      {isVideo && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMuted((m) => !m);
          }}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full glass-dark flex items-center justify-center"
        >
          {isMuted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          )}
        </button>
      )}

      {/* Post overlay */}
      <PostOverlay
        post={post}
        isLiked={isLiked ?? false}
        onLike={handleLike}
        onComment={() => setShowComments(true)}
        onNavigateToProfile={onNavigateToProfile}
      />

      {/* Comments panel */}
      {showComments && (
        <CommentsPanel
          postId={post.id}
          onClose={() => setShowComments(false)}
        />
      )}
    </div>
  );
}
