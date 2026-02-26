import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface UserWithTrendingPosts {
    username: string;
    profilePicture?: ExternalBlob;
    trendingPostsCount: bigint;
}
export interface Comment {
    id: bigint;
    createdAt: bigint;
    text: string;
    authorPrincipal: Principal;
    postId: bigint;
}
export interface Post {
    id: bigint;
    createdAt: bigint;
    mediaBlob: ExternalBlob;
    caption: string;
    mediaType: MediaType;
    commentsCount: bigint;
    likesCount: bigint;
    authorPrincipal: Principal;
}
export interface Hashtag {
    postCount: bigint;
    postIds: Array<bigint>;
    name: string;
}
export interface SocialFeature {
    name: string;
    engagementRate: bigint;
    iconUrl: string;
    postsCount: bigint;
}
export interface UserProfile {
    bio: string;
    principal: Principal;
    username: string;
    followersCount: bigint;
    createdAt: bigint;
    totalLikes: bigint;
    followingCount: bigint;
    profilePicture?: ExternalBlob;
    postsCount: bigint;
}
export enum MediaType {
    video = "video",
    photo = "photo"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    /**
     * / Add a comment to a post. Requires #user role.
     */
    addComment(postId: bigint, text: string): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    /**
     * / Create a new post. Requires #user role.
     */
    createPost(mediaFile: ExternalBlob, mediaType: MediaType, caption: string, hashtags: Array<string>): Promise<bigint>;
    /**
     * / Create a visual effect. Requires #user role.
     */
    createVisualEffect(name: string, effectType: string, intensity: bigint, previewUrl: string): Promise<void>;
    /**
     * / Delete a comment. Requires #user role. Only comment author or post owner can delete.
     */
    deleteComment(commentId: bigint): Promise<void>;
    /**
     * / Delete a post. Requires #user role and caller must be the post owner.
     */
    deletePost(postId: bigint): Promise<void>;
    /**
     * / Follow a user. Requires #user role.
     */
    followUser(target: Principal): Promise<void>;
    /**
     * / Get the calling user's own profile. Requires #user role.
     */
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Get paginated comments for a post. No auth required.
     */
    getComments(postId: bigint, page: bigint, pageSize: bigint): Promise<Array<Comment>>;
    /**
     * / Get engagement rate for content. No auth required.
     */
    getEngagementRate(contentId: string, contentType: string): Promise<number>;
    /**
     * / Get feature details. No auth required.
     */
    getFeatureDetails(featureName: string): Promise<SocialFeature | null>;
    /**
     * / Get paginated feed ordered by recency. No auth required.
     */
    getFeed(page: bigint, pageSize: bigint): Promise<Array<Post>>;
    /**
     * / Get paginated followers of a user. No auth required.
     */
    getFollowers(user: Principal, page: bigint, pageSize: bigint): Promise<Array<Principal>>;
    /**
     * / Get paginated following of a user. No auth required.
     */
    getFollowing(user: Principal, page: bigint, pageSize: bigint): Promise<Array<Principal>>;
    /**
     * / Get a post by id. No auth required (public content).
     */
    getPost(postId: bigint): Promise<Post | null>;
    /**
     * / Get paginated posts by a specific user. No auth required.
     */
    getPostsByUser(user: Principal, page: bigint, pageSize: bigint): Promise<Array<Post>>;
    /**
     * / Get related features. No auth required.
     */
    getRelatedFeatures(featureName: string): Promise<Array<SocialFeature> | null>;
    /**
     * / Get top hashtags. No auth required.
     */
    getTopHashtags(): Promise<Array<Hashtag>>;
    /**
     * / Get users who created most trending posts. No auth required.
     */
    getTopTrendingUsers(): Promise<Array<UserWithTrendingPosts>>;
    /**
     * / Get trending features. No auth required.
     */
    getTrendingFeatures(): Promise<Array<SocialFeature> | null>;
    /**
     * / Get trending posts summary. No auth required.
     */
    getTrendingPosts(): Promise<Array<{
        likesCount: bigint;
        postId: bigint;
    }>>;
    /**
     * / Get posts ordered by likesCount descending. No auth required.
     */
    getTrendingPostsList(page: bigint, pageSize: bigint): Promise<Array<Post>>;
    /**
     * / Get any user's profile by principal. Caller must be #user or admin.
     */
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    /**
     * / Check if the calling user is following a target. Requires #user role.
     */
    isFollowing(target: Principal): Promise<boolean>;
    /**
     * / Check if the calling user has liked a post. Requires #user role.
     */
    isLiked(postId: bigint): Promise<boolean>;
    /**
     * / Check if content is viral. No auth required.
     */
    isViral(contentId: string, contentType: string): Promise<boolean>;
    /**
     * / Like a post. Requires #user role.
     */
    likePost(postId: bigint): Promise<void>;
    /**
     * / Register a new user profile. Requires #user role (authenticated principal).
     */
    registerUser(username: string, bio: string, profilePicture: ExternalBlob | null): Promise<void>;
    /**
     * / Save/update the calling user's own profile. Requires #user role.
     */
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    /**
     * / Search posts by caption. No auth required.
     */
    searchPosts(searchQuery: string, page: bigint, pageSize: bigint): Promise<Array<Post>>;
    /**
     * / Search users by username. No auth required.
     */
    searchUsers(searchQuery: string, page: bigint, pageSize: bigint): Promise<Array<UserProfile>>;
    /**
     * / Unfollow a user. Requires #user role.
     */
    unfollowUser(target: Principal): Promise<void>;
    /**
     * / Unlike a post. Requires #user role.
     */
    unlikePost(postId: bigint): Promise<void>;
    /**
     * / Update own profile. Requires #user role and caller must own the profile.
     */
    updateProfile(username: string, bio: string, profilePicture: ExternalBlob | null): Promise<void>;
}
