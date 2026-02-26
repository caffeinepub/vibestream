import { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2 } from 'lucide-react';
import { useGetComments, useAddComment, useDeleteComment, useGetUserProfile } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import type { Comment } from '../backend';
import { Skeleton } from '@/components/ui/skeleton';

interface CommentsPanelProps {
  postId: bigint;
  onClose: () => void;
}

export default function CommentsPanel({ postId, onClose }: CommentsPanelProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { identity } = useInternetIdentity();
  const { data: comments, isLoading } = useGetComments(postId);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !identity) return;
    try {
      await addComment.mutateAsync({ postId, text: text.trim() });
      setText('');
    } catch {
      // ignore
    }
  };

  const handleDelete = async (comment: Comment) => {
    try {
      await deleteComment.mutateAsync({ commentId: comment.id, postId });
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Panel */}
      <div
        className="glass-dark rounded-t-3xl flex flex-col"
        style={{ maxHeight: '70vh', minHeight: '50vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-display font-semibold text-white">Comments</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full glass-card flex items-center justify-center"
          >
            <X size={16} color="white" />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 flex flex-col gap-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full skeleton-shimmer shrink-0" />
                <div className="flex-1 flex flex-col gap-1">
                  <Skeleton className="h-3 w-24 skeleton-shimmer rounded" />
                  <Skeleton className="h-4 w-full skeleton-shimmer rounded" />
                </div>
              </div>
            ))
          ) : !comments || comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <span className="text-3xl">💬</span>
              <p className="text-muted-foreground text-sm">No comments yet. Be the first!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id.toString()}
                comment={comment}
                currentPrincipal={identity?.getPrincipal().toString()}
                onDelete={() => handleDelete(comment)}
                isDeleting={deleteComment.isPending}
              />
            ))
          )}
        </div>

        {/* Input */}
        {identity && (
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 px-4 py-3 border-t border-white/10 safe-bottom"
          >
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment..."
              maxLength={500}
              className="flex-1 bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-vibe-purple"
            />
            <button
              type="submit"
              disabled={!text.trim() || addComment.isPending}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #8A2BE2, #6a1fb5)' }}
            >
              {addComment.isPending ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={16} color="white" />
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  currentPrincipal?: string;
  onDelete: () => void;
  isDeleting: boolean;
}

function CommentItem({ comment, currentPrincipal, onDelete, isDeleting }: CommentItemProps) {
  const authorId = comment.authorPrincipal.toString();
  const { data: authorProfile } = useGetUserProfile(authorId);
  const isOwn = currentPrincipal === authorId;

  const avatarUrl = authorProfile?.profilePicture
    ? authorProfile.profilePicture.getDirectURL()
    : '/assets/generated/default-avatar.dim_256x256.png';

  return (
    <div className="flex gap-3 items-start">
      <img
        src={avatarUrl}
        alt={authorProfile?.username || 'User'}
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">
            @{authorProfile?.username || authorId.slice(0, 8)}
          </span>
        </div>
        <p className="text-sm text-foreground mt-0.5 break-words">{comment.text}</p>
      </div>
      {isOwn && (
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
        >
          <Trash2 size={13} color="#ff4444" />
        </button>
      )}
    </div>
  );
}
