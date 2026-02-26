import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { UserProfile, Post, Comment, MediaType } from '../backend';
import { ExternalBlob } from '../backend';
import type { Principal } from '@dfinity/principal';

// ─── User Profile ────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    // Only fire when we have an authenticated actor (not anonymous) and identity is set
    enabled: !!actor && !actorFetching && !!identity,
    retry: false,
    // Don't refetch in background to avoid flickering
    refetchOnWindowFocus: false,
  });

  // isLoading: true only when we don't have data yet and are waiting
  // Don't include actorFetching here if we already have query data
  const isLoading = (actorFetching && !query.data && !query.isFetched) || (query.isLoading && !query.isFetched);

  // isFetched: true once the query has completed at least once with the current identity
  // Don't gate on actorFetching to avoid false negatives after background refetches
  const isFetched = !!identity && query.isFetched;

  return {
    ...query,
    isLoading,
    isFetched,
  };
}

export function useGetUserProfile(userPrincipal: string | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', userPrincipal],
    queryFn: async () => {
      if (!actor || !userPrincipal) return null;
      const { Principal } = await import('@dfinity/principal');
      return actor.getUserProfile(Principal.fromText(userPrincipal));
    },
    enabled: !!actor && !actorFetching && !!userPrincipal && !!identity,
  });
}

export function useRegisterUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async ({
      username,
      bio,
      profilePicture,
    }: {
      username: string;
      bio: string;
      profilePicture: ExternalBlob | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.registerUser(username, bio, profilePicture);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile', identity?.getPrincipal().toString()] });
    },
  });
}

export function useUpdateProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async ({
      username,
      bio,
      profilePicture,
    }: {
      username: string;
      bio: string;
      profilePicture: ExternalBlob | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateProfile(username, bio, profilePicture);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile', identity?.getPrincipal().toString()] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });
}

// ─── Feed & Posts ─────────────────────────────────────────────────────────────

export function useGetFeed(page = 0, pageSize = 10) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Post[]>({
    queryKey: ['feed', page, pageSize],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFeed(BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetPostsByUser(userPrincipal: string | null, page = 0, pageSize = 20) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Post[]>({
    queryKey: ['postsByUser', userPrincipal, page, pageSize],
    queryFn: async () => {
      if (!actor || !userPrincipal) return [];
      const { Principal } = await import('@dfinity/principal');
      return actor.getPostsByUser(Principal.fromText(userPrincipal), BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !actorFetching && !!userPrincipal,
  });
}

export function useGetTrendingPosts(page = 0, pageSize = 20) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Post[]>({
    queryKey: ['trendingPosts', page, pageSize],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTrendingPostsList(BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useCreatePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async ({
      mediaFile,
      mediaType,
      caption,
      hashtags,
    }: {
      mediaFile: ExternalBlob;
      mediaType: MediaType;
      caption: string;
      hashtags: string[];
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createPost(mediaFile, mediaType, caption, hashtags);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['postsByUser', identity?.getPrincipal().toString()] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['trendingPosts'] });
    },
  });
}

export function useDeletePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deletePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['postsByUser'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// ─── Likes ────────────────────────────────────────────────────────────────────

export function useIsLiked(postId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['isLiked', postId?.toString(), identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || postId === null) return false;
      return actor.isLiked(postId);
    },
    enabled: !!actor && !actorFetching && postId !== null && !!identity,
  });
}

export function useLikePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.likePost(postId);
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['isLiked', postId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['trendingPosts'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile', identity?.getPrincipal().toString()] });
    },
  });
}

export function useUnlikePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.unlikePost(postId);
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['isLiked', postId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['trendingPosts'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile', identity?.getPrincipal().toString()] });
    },
  });
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export function useGetComments(postId: bigint | null, page = 0, pageSize = 50) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Comment[]>({
    queryKey: ['comments', postId?.toString(), page, pageSize],
    queryFn: async () => {
      if (!actor || postId === null) return [];
      return actor.getComments(postId, BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !actorFetching && postId !== null,
  });
}

export function useAddComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, text }: { postId: bigint; text: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addComment(postId, text);
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useDeleteComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: bigint; postId: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteComment(commentId);
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

// ─── Follow ───────────────────────────────────────────────────────────────────

export function useIsFollowing(targetPrincipal: string | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['isFollowing', targetPrincipal, identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !targetPrincipal) return false;
      const { Principal } = await import('@dfinity/principal');
      return actor.isFollowing(Principal.fromText(targetPrincipal));
    },
    enabled: !!actor && !actorFetching && !!targetPrincipal && !!identity,
  });
}

export function useFollowUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetPrincipal: string) => {
      if (!actor) throw new Error('Actor not available');
      const { Principal } = await import('@dfinity/principal');
      return actor.followUser(Principal.fromText(targetPrincipal));
    },
    onSuccess: (_, targetPrincipal) => {
      queryClient.invalidateQueries({ queryKey: ['isFollowing', targetPrincipal] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', targetPrincipal] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useUnfollowUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetPrincipal: string) => {
      if (!actor) throw new Error('Actor not available');
      const { Principal } = await import('@dfinity/principal');
      return actor.unfollowUser(Principal.fromText(targetPrincipal));
    },
    onSuccess: (_, targetPrincipal) => {
      queryClient.invalidateQueries({ queryKey: ['isFollowing', targetPrincipal] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', targetPrincipal] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// ─── Search ───────────────────────────────────────────────────────────────────

export function useSearchUsers(query: string, page = 0, pageSize = 20) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile[]>({
    queryKey: ['searchUsers', query, page, pageSize],
    queryFn: async () => {
      if (!actor || !query.trim()) return [];
      return actor.searchUsers(query, BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !actorFetching && query.trim().length > 0,
  });
}

export function useSearchPosts(query: string, page = 0, pageSize = 20) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Post[]>({
    queryKey: ['searchPosts', query, page, pageSize],
    queryFn: async () => {
      if (!actor || !query.trim()) return [];
      return actor.searchPosts(query, BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !actorFetching && query.trim().length > 0,
  });
}
