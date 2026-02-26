import { useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import type { Post } from '../backend';
import { useGetUserProfile } from '../hooks/useQueries';

interface PostOverlayProps {
  post: Post;
  isLiked: boolean;
  onLike: () => void;
  onComment: () => void;
  onNavigateToProfile: (userId: string) => void;
}

export default function PostOverlay({ post, isLiked, onLike, onComment, onNavigateToProfile }: PostOverlayProps) {
  const authorId = post.authorPrincipal.toString();
  const { data: authorProfile } = useGetUserProfile(authorId);
  const [localLiked, setLocalLiked] = useState(isLiked);
  const [localLikes, setLocalLikes] = useState(Number(post.likesCount));

  // Sync with server state
  if (isLiked !== localLiked && !localLiked) {
    setLocalLiked(isLiked);
    setLocalLikes(Number(post.likesCount));
  }

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newLiked = !localLiked;
    setLocalLiked(newLiked);
    setLocalLikes((prev) => (newLiked ? prev + 1 : Math.max(0, prev - 1)));
    onLike();
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComment();
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigateToProfile(authorId);
  };

  const avatarUrl = authorProfile?.profilePicture
    ? authorProfile.profilePicture.getDirectURL()
    : '/assets/generated/default-avatar.dim_256x256.png';

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 pb-20 px-4">
      <div className="flex items-end justify-between gap-4">
        {/* Left: Author info + caption */}
        <div className="flex-1 min-w-0">
          <button
            onClick={handleProfileClick}
            className="flex items-center gap-2 mb-2"
          >
            <img
              src={avatarUrl}
              alt={authorProfile?.username || 'User'}
              className="w-9 h-9 rounded-full object-cover border-2"
              style={{ borderColor: '#8A2BE2' }}
            />
            <span className="font-display font-semibold text-white text-sm">
              @{authorProfile?.username || authorId.slice(0, 8)}
            </span>
          </button>
          {post.caption && (
            <p className="text-white text-sm leading-relaxed line-clamp-2 max-w-xs">
              {post.caption}
            </p>
          )}
        </div>

        {/* Right: Action buttons */}
        <div className="flex flex-col items-center gap-5 pb-2">
          {/* Like */}
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1 transition-transform active:scale-90"
          >
            <div
              className="w-11 h-11 rounded-full glass-dark flex items-center justify-center transition-all duration-200"
              style={localLiked ? { background: 'rgba(138, 43, 226, 0.3)', borderColor: '#8A2BE2' } : {}}
            >
              <Heart
                size={22}
                fill={localLiked ? '#8A2BE2' : 'none'}
                color={localLiked ? '#8A2BE2' : 'white'}
                strokeWidth={2}
              />
            </div>
            <span className="text-white text-xs font-medium">{formatCount(localLikes)}</span>
          </button>

          {/* Comment */}
          <button
            onClick={handleComment}
            className="flex flex-col items-center gap-1 transition-transform active:scale-90"
          >
            <div className="w-11 h-11 rounded-full glass-dark flex items-center justify-center">
              <MessageCircle size={22} color="white" strokeWidth={2} />
            </div>
            <span className="text-white text-xs font-medium">{formatCount(Number(post.commentsCount))}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
