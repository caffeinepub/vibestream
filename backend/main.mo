import Int "mo:core/Int";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";

import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";

actor {
  // Core types
  public type MediaType = {
    #video;
    #photo;
  };

  public type UserProfile = {
    principal : Principal;
    username : Text;
    bio : Text;
    profilePicture : ?Storage.ExternalBlob;
    followersCount : Nat;
    followingCount : Nat;
    totalLikes : Nat;
    postsCount : Nat;
    createdAt : Int;
  };

  public type Post = {
    id : Nat;
    authorPrincipal : Principal;
    mediaBlob : Storage.ExternalBlob;
    mediaType : MediaType;
    caption : Text;
    likesCount : Nat;
    commentsCount : Nat;
    createdAt : Int;
  };

  public type Comment = {
    id : Nat;
    postId : Nat;
    authorPrincipal : Principal;
    text : Text;
    createdAt : Int;
  };

  public type UserWithTrendingPosts = {
    username : Text;
    profilePicture : ?Storage.ExternalBlob;
    trendingPostsCount : Nat;
  };

  public type Hashtag = {
    name : Text;
    postIds : [Nat];
    postCount : Nat;
  };

  module Hashtag {
    public func compareByPostsCount(hashtag1 : Hashtag, hashtag2 : Hashtag) : Order.Order {
      Nat.compare(hashtag2.postCount, hashtag1.postCount);
    };
  };

  module UserWithTrendingPosts {
    public func compareByTrendingPostsCount(user1 : UserWithTrendingPosts, user2 : UserWithTrendingPosts) : Order.Order {
      Nat.compare(user2.trendingPostsCount, user1.trendingPostsCount);
    };
  };

  // Persistent storage
  let accessControlState = AccessControl.initState();

  include MixinAuthorization(accessControlState);
  include MixinStorage();

  let trendingPosts = List.empty<
    {
      postId : Nat;
      likesCount : Nat;
    }
  >();

  let hashtagsMap = Map.empty<Text, Hashtag>();
  let userTrendingPostsMap = Map.empty<Principal, UserWithTrendingPosts>();

  type SocialFeature = {
    name : Text;
    iconUrl : Text;
    engagementRate : Nat;
    postsCount : Nat;
  };

  let socialFeaturesMap = Map.empty<Text, SocialFeature>();

  var nextPostId = 1;
  var nextCommentId = 1;

  let userProfiles = Map.empty<Principal, UserProfile>();
  let posts = Map.empty<Nat, Post>();
  let comments = Map.empty<Nat, Comment>();
  let postLikes = Map.empty<Nat, Set.Set<Principal>>();
  let userFollowers = Map.empty<Principal, Set.Set<Principal>>();
  let userFollowing = Map.empty<Principal, Set.Set<Principal>>();
  let postHashtagsMap = Map.empty<Nat, [Text]>();

  // -----------------------------------------------------------------------
  // Required profile functions (per instructions)
  // -----------------------------------------------------------------------
  /// Get the calling user's own profile. Requires #user role.
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get their profile");
    };
    userProfiles.get(caller);
  };

  /// Save/update the calling user's own profile. Requires #user role.
  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    // Ensure the stored principal matches the caller
    let profileToStore : UserProfile = {
      principal = caller;
      username = profile.username;
      bio = profile.bio;
      profilePicture = profile.profilePicture;
      followersCount = profile.followersCount;
      followingCount = profile.followingCount;
      totalLikes = profile.totalLikes;
      postsCount = profile.postsCount;
      createdAt = profile.createdAt;
    };
    userProfiles.add(caller, profileToStore);
  };

  /// Get any user's profile by principal. Caller must be #user or admin.
  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(user);
  };

  // -----------------------------------------------------------------------
  // User registration and profile management
  // -----------------------------------------------------------------------
  /// Register a new user profile. Requires #user role (authenticated principal).
  public shared ({ caller }) func registerUser(username : Text, bio : Text, profilePicture : ?Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can register");
    };
    if (userProfiles.values().any(func(profile) { profile.username == username })) {
      Runtime.trap("Username already exists");
    };
    let userProfile : UserProfile = {
      principal = caller;
      username;
      bio;
      profilePicture;
      followersCount = 0;
      followingCount = 0;
      totalLikes = 0;
      postsCount = 0;
      createdAt = 0;
    };
    userProfiles.add(caller, userProfile);
  };

  /// Update own profile. Requires #user role and caller must own the profile.
  public shared ({ caller }) func updateProfile(username : Text, bio : Text, profilePicture : ?Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update profiles");
    };

    // Check username uniqueness (excluding own current username)
    let existingWithUsername = userProfiles.values().find(
      func(profile) { profile.username == username and profile.principal != caller }
    );
    if (existingWithUsername != null) {
      Runtime.trap("Username already taken");
    };

    switch (userProfiles.get(caller)) {
      case (?profile) {
        let updatedProfile : UserProfile = {
          principal = profile.principal;
          username;
          bio;
          profilePicture;
          followersCount = profile.followersCount;
          followingCount = profile.followingCount;
          totalLikes = profile.totalLikes;
          postsCount = profile.postsCount;
          createdAt = profile.createdAt;
        };
        userProfiles.add(caller, updatedProfile);
      };
      case (null) { Runtime.trap("User profile not found") };
    };
  };

  // -----------------------------------------------------------------------
  // Post management
  // -----------------------------------------------------------------------
  /// Create a new post. Requires #user role.
  public shared ({ caller }) func createPost(mediaFile : Storage.ExternalBlob, mediaType : MediaType, caption : Text, hashtags : [Text]) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create posts");
    };
    let postId = nextPostId;
    nextPostId += 1;

    let post : Post = {
      id = postId;
      authorPrincipal = caller;
      mediaBlob = mediaFile;
      mediaType;
      caption;
      likesCount = 0;
      commentsCount = 0;
      createdAt = 0;
    };

    posts.add(postId, post);

    let processedHashtags = tokensToHashtags(hashtags);
    postHashtagsMap.add(postId, processedHashtags);

    switch (userProfiles.get(caller)) {
      case (?profile) {
        let updatedProfile : UserProfile = {
          principal = profile.principal;
          username = profile.username;
          bio = profile.bio;
          profilePicture = profile.profilePicture;
          followersCount = profile.followersCount;
          followingCount = profile.followingCount;
          totalLikes = profile.totalLikes;
          postsCount = profile.postsCount + 1;
          createdAt = profile.createdAt;
        };
        userProfiles.add(caller, updatedProfile);
      };
      case (null) { Runtime.trap("User profile not found") };
    };

    postId;
  };

  /// Delete a post. Requires #user role and caller must be the post owner.
  public shared ({ caller }) func deletePost(postId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete posts");
    };
    switch (posts.get(postId)) {
      case (?post) {
        if (post.authorPrincipal != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the post owner can delete this post");
        };
        posts.remove(postId);
        // Update user postsCount
        switch (userProfiles.get(post.authorPrincipal)) {
          case (?profile) {
            let updatedProfile : UserProfile = {
              principal = profile.principal;
              username = profile.username;
              bio = profile.bio;
              profilePicture = profile.profilePicture;
              followersCount = profile.followersCount;
              followingCount = profile.followingCount;
              totalLikes = profile.totalLikes;
              postsCount = if (profile.postsCount > 0) { profile.postsCount - 1 } else { 0 };
              createdAt = profile.createdAt;
            };
            userProfiles.add(post.authorPrincipal, updatedProfile);
          };
          case (null) { };
        };
      };
      case (null) { Runtime.trap("Post not found") };
    };
  };

  /// Get a post by id. No auth required (public content).
  public query func getPost(postId : Nat) : async ?Post {
    posts.get(postId);
  };

  /// Get paginated feed ordered by recency. No auth required.
  public query func getFeed(page : Nat, pageSize : Nat) : async [Post] {
    let allPosts = posts.toArray().map(func((_, post)) { post });
    let sorted = allPosts.sort(func(a, b) { Int.compare(b.createdAt, a.createdAt) });
    let start = page * pageSize;
    if (start >= sorted.size()) { return [] };
    let end = if (start + pageSize > sorted.size()) { sorted.size() } else { start + pageSize };
    if (start >= sorted.size()) { return [] };
    if (end > sorted.size()) {
      sorted.sliceToArray(start, sorted.size());
    } else {
      sorted.sliceToArray(start, end);
    };
  };

  /// Get paginated posts by a specific user. No auth required.
  public query func getPostsByUser(user : Principal, page : Nat, pageSize : Nat) : async [Post] {
    let userPosts = posts.toArray()
      .map(func((_, post)) { post })
      .filter(func(post) { post.authorPrincipal == user });
    let sorted = userPosts.sort(func(a, b) { Int.compare(b.createdAt, a.createdAt) });
    let start = page * pageSize;
    if (start >= sorted.size()) { return [] };
    let end = if (start + pageSize > sorted.size()) { sorted.size() } else { start + pageSize };
    if (start >= sorted.size()) { return [] };
    if (end > sorted.size()) {
      sorted.sliceToArray(start, sorted.size());
    } else {
      sorted.sliceToArray(start, end);
    };
  };

  /// Get posts ordered by likesCount descending. No auth required.
  public query func getTrendingPostsList(page : Nat, pageSize : Nat) : async [Post] {
    let allPosts = posts.toArray().map(func((_, post)) { post });
    let sorted = allPosts.sort(
      func(a, b) {
        Nat.compare(b.likesCount, a.likesCount);
      }
    );
    let start = page * pageSize;
    if (start >= sorted.size()) { return [] };
    let end = if (start + pageSize > sorted.size()) { sorted.size() } else { start + pageSize };
    if (start >= sorted.size()) { return [] };
    if (end > sorted.size()) {
      sorted.sliceToArray(start, sorted.size());
    } else {
      sorted.sliceToArray(start, end);
    };
  };

  // -----------------------------------------------------------------------
  // Comment management
  // -----------------------------------------------------------------------
  /// Add a comment to a post. Requires #user role.
  public shared ({ caller }) func addComment(postId : Nat, text : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add comments");
    };
    let commentId = nextCommentId;
    nextCommentId += 1;

    let comment : Comment = {
      id = commentId;
      postId;
      authorPrincipal = caller;
      text;
      createdAt = 0;
    };

    comments.add(commentId, comment);

    switch (posts.get(postId)) {
      case (?post) {
        let updatedPost : Post = {
          id = post.id;
          authorPrincipal = post.authorPrincipal;
          mediaBlob = post.mediaBlob;
          mediaType = post.mediaType;
          caption = post.caption;
          likesCount = post.likesCount;
          commentsCount = post.commentsCount + 1;
          createdAt = post.createdAt;
        };
        posts.add(postId, updatedPost);
      };
      case (null) { Runtime.trap("Post not found") };
    };

    commentId;
  };

  /// Delete a comment. Requires #user role. Only comment author or post owner can delete.
  public shared ({ caller }) func deleteComment(commentId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete comments");
    };
    switch (comments.get(commentId)) {
      case (?comment) {
        // Check if caller is comment author or post owner
        let isCommentAuthor = comment.authorPrincipal == caller;
        var isPostOwner = false;
        switch (posts.get(comment.postId)) {
          case (?post) {
            isPostOwner := post.authorPrincipal == caller;
          };
          case (null) { };
        };
        if (not isCommentAuthor and not isPostOwner and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the comment author or post owner can delete this comment");
        };
        comments.remove(commentId);
        // Decrement commentsCount on post
        switch (posts.get(comment.postId)) {
          case (?post) {
            let updatedPost : Post = {
              id = post.id;
              authorPrincipal = post.authorPrincipal;
              mediaBlob = post.mediaBlob;
              mediaType = post.mediaType;
              caption = post.caption;
              likesCount = post.likesCount;
              commentsCount = if (post.commentsCount > 0) { post.commentsCount - 1 } else { 0 };
              createdAt = post.createdAt;
            };
            posts.add(comment.postId, updatedPost);
          };
          case (null) { };
        };
      };
      case (null) { Runtime.trap("Comment not found") };
    };
  };

  /// Get paginated comments for a post. No auth required.
  public query func getComments(postId : Nat, page : Nat, pageSize : Nat) : async [Comment] {
    let postComments = comments.toArray()
      .map(func((_, comment)) { comment })
      .filter(func(comment) { comment.postId == postId });
    let sorted = postComments.sort(
      func(a, b) {
        Int.compare(a.createdAt, b.createdAt);
      }
    );
    let start = page * pageSize;
    if (start >= sorted.size()) { return [] };
    let end = if (start + pageSize > sorted.size()) { sorted.size() } else { start + pageSize };
    if (start >= sorted.size()) { return [] };
    if (end > sorted.size()) {
      sorted.sliceToArray(start, sorted.size());
    } else {
      sorted.sliceToArray(start, end);
    };
  };

  // -----------------------------------------------------------------------
  // Like management
  // -----------------------------------------------------------------------
  /// Like a post. Requires #user role.
  public shared ({ caller }) func likePost(postId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like posts");
    };

    switch (postLikes.get(postId)) {
      case (?likes) {
        if (likes.contains(caller)) {
          Runtime.trap("Already liked");
        };
        let newLikes = likes.clone();
        newLikes.add(caller);
        postLikes.add(postId, newLikes);
      };
      case (null) {
        let newLikeSet = Set.fromIter([caller].values());
        postLikes.add(postId, newLikeSet);
      };
    };

    switch (posts.get(postId)) {
      case (?post) {
        let updatedPost : Post = {
          id = post.id;
          authorPrincipal = post.authorPrincipal;
          mediaBlob = post.mediaBlob;
          mediaType = post.mediaType;
          caption = post.caption;
          likesCount = post.likesCount + 1;
          commentsCount = post.commentsCount;
          createdAt = post.createdAt;
        };
        posts.add(postId, updatedPost);

        switch (userProfiles.get(post.authorPrincipal)) {
          case (?profile) {
            let updatedProfile : UserProfile = {
              principal = profile.principal;
              username = profile.username;
              bio = profile.bio;
              profilePicture = profile.profilePicture;
              followersCount = profile.followersCount;
              followingCount = profile.followingCount;
              totalLikes = profile.totalLikes + 1;
              postsCount = profile.postsCount;
              createdAt = profile.createdAt;
            };
            userProfiles.add(post.authorPrincipal, updatedProfile);
          };
          case (null) { };
        };
      };
      case (null) { Runtime.trap("Post not found") };
    };

    switch (postHashtagsMap.get(postId)) {
      case (?hashtags) {
        for (hashtag in hashtags.values()) {
          switch (hashtagsMap.get(hashtag)) {
            case (?ht) {
              let updatedHashtag : Hashtag = {
                name = ht.name;
                postIds = ht.postIds;
                postCount = ht.postCount + 1;
              };
              hashtagsMap.add(ht.name, updatedHashtag);
            };
            case (null) {
              let newHashtag : Hashtag = {
                name = hashtag;
                postIds = [postId];
                postCount = 1;
              };
              hashtagsMap.add(hashtag, newHashtag);
            };
          };
        };
      };
      case (null) { };
    };
  };

  /// Unlike a post. Requires #user role.
  public shared ({ caller }) func unlikePost(postId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unlike posts");
    };

    switch (postLikes.get(postId)) {
      case (?likes) {
        if (not likes.contains(caller)) {
          Runtime.trap("Not liked yet");
        };
        let newLikes = likes.clone();
        newLikes.remove(caller);
        postLikes.add(postId, newLikes);
      };
      case (null) { Runtime.trap("Post has no likes") };
    };

    switch (posts.get(postId)) {
      case (?post) {
        let updatedPost : Post = {
          id = post.id;
          authorPrincipal = post.authorPrincipal;
          mediaBlob = post.mediaBlob;
          mediaType = post.mediaType;
          caption = post.caption;
          likesCount = if (post.likesCount > 0) { post.likesCount - 1 } else { 0 };
          commentsCount = post.commentsCount;
          createdAt = post.createdAt;
        };
        posts.add(postId, updatedPost);

        switch (userProfiles.get(post.authorPrincipal)) {
          case (?profile) {
            let updatedProfile : UserProfile = {
              principal = profile.principal;
              username = profile.username;
              bio = profile.bio;
              profilePicture = profile.profilePicture;
              followersCount = profile.followersCount;
              followingCount = profile.followingCount;
              totalLikes = if (profile.totalLikes > 0) { profile.totalLikes - 1 } else { 0 };
              postsCount = profile.postsCount;
              createdAt = profile.createdAt;
            };
            userProfiles.add(post.authorPrincipal, updatedProfile);
          };
          case (null) { };
        };
      };
      case (null) { Runtime.trap("Post not found") };
    };
  };

  /// Check if the calling user has liked a post. Requires #user role.
  public query ({ caller }) func isLiked(postId : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check likes");
    };
    switch (postLikes.get(postId)) {
      case (?likes) { likes.contains(caller) };
      case (null) { false };
    };
  };

  // -----------------------------------------------------------------------
  // Follow / Unfollow
  // -----------------------------------------------------------------------
  /// Follow a user. Requires #user role.
  public shared ({ caller }) func followUser(target : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can follow others");
    };
    if (caller == target) {
      Runtime.trap("Cannot follow yourself");
    };

    // Update caller's following set
    switch (userFollowing.get(caller)) {
      case (?following) {
        if (following.contains(target)) {
          Runtime.trap("Already following");
        };
        let newFollowing = following.clone();
        newFollowing.add(target);
        userFollowing.add(caller, newFollowing);
      };
      case (null) {
        let newFollowing = Set.fromIter([target].values());
        userFollowing.add(caller, newFollowing);
      };
    };

    // Update target's followers set
    switch (userFollowers.get(target)) {
      case (?followers) {
        let newFollowers = followers.clone();
        newFollowers.add(caller);
        userFollowers.add(target, newFollowers);
      };
      case (null) {
        let newFollowers = Set.fromIter([caller].values());
        userFollowers.add(target, newFollowers);
      };
    };

    // Update followingCount for caller
    switch (userProfiles.get(caller)) {
      case (?profile) {
        let updatedProfile : UserProfile = {
          principal = profile.principal;
          username = profile.username;
          bio = profile.bio;
          profilePicture = profile.profilePicture;
          followersCount = profile.followersCount;
          followingCount = profile.followingCount + 1;
          totalLikes = profile.totalLikes;
          postsCount = profile.postsCount;
          createdAt = profile.createdAt;
        };
        userProfiles.add(caller, updatedProfile);
      };
      case (null) { };
    };

    // Update followersCount for target
    switch (userProfiles.get(target)) {
      case (?profile) {
        let updatedProfile : UserProfile = {
          principal = profile.principal;
          username = profile.username;
          bio = profile.bio;
          profilePicture = profile.profilePicture;
          followersCount = profile.followersCount + 1;
          followingCount = profile.followingCount;
          totalLikes = profile.totalLikes;
          postsCount = profile.postsCount;
          createdAt = profile.createdAt;
        };
        userProfiles.add(target, updatedProfile);
      };
      case (null) { };
    };
  };

  /// Unfollow a user. Requires #user role.
  public shared ({ caller }) func unfollowUser(target : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unfollow others");
    };
    if (caller == target) {
      Runtime.trap("Cannot unfollow yourself");
    };

    // Update caller's following set
    switch (userFollowing.get(caller)) {
      case (?following) {
        if (not following.contains(target)) {
          Runtime.trap("Not following");
        };
        let newFollowing = following.clone();
        newFollowing.remove(target);
        userFollowing.add(caller, newFollowing);
      };
      case (null) { Runtime.trap("Not following anyone") };
    };

    // Update target's followers set
    switch (userFollowers.get(target)) {
      case (?followers) {
        let newFollowers = followers.clone();
        newFollowers.remove(caller);
        userFollowers.add(target, newFollowers);
      };
      case (null) { };
    };

    // Update followingCount for caller
    switch (userProfiles.get(caller)) {
      case (?profile) {
        let updatedProfile : UserProfile = {
          principal = profile.principal;
          username = profile.username;
          bio = profile.bio;
          profilePicture = profile.profilePicture;
          followersCount = profile.followersCount;
          followingCount = if (profile.followingCount > 0) { profile.followingCount - 1 } else { 0 };
          totalLikes = profile.totalLikes;
          postsCount = profile.postsCount;
          createdAt = profile.createdAt;
        };
        userProfiles.add(caller, updatedProfile);
      };
      case (null) { };
    };

    // Update followersCount for target
    switch (userProfiles.get(target)) {
      case (?profile) {
        let updatedProfile : UserProfile = {
          principal = profile.principal;
          username = profile.username;
          bio = profile.bio;
          profilePicture = profile.profilePicture;
          followersCount = if (profile.followersCount > 0) { profile.followersCount - 1 } else { 0 };
          followingCount = profile.followingCount;
          totalLikes = profile.totalLikes;
          postsCount = profile.postsCount;
          createdAt = profile.createdAt;
        };
        userProfiles.add(target, updatedProfile);
      };
      case (null) { };
    };
  };

  /// Check if the calling user is following a target. Requires #user role.
  public query ({ caller }) func isFollowing(target : Principal) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check following status");
    };
    switch (userFollowing.get(caller)) {
      case (?following) { following.contains(target) };
      case (null) { false };
    };
  };

  /// Get paginated followers of a user. No auth required.
  public query func getFollowers(user : Principal, page : Nat, pageSize : Nat) : async [Principal] {
    switch (userFollowers.get(user)) {
      case (?followers) {
        let arr = followers.toArray();
        let start = page * pageSize;
        if (start >= arr.size()) { return [] };
        let end = if (start + pageSize > arr.size()) { arr.size() } else { start + pageSize };
        let resultArray = if (end > arr.size()) {
          arr.sliceToArray(start, arr.size());
        } else {
          arr.sliceToArray(start, end);
        };
        resultArray;
      };
      case (null) { [] };
    };
  };

  /// Get paginated following of a user. No auth required.
  public query func getFollowing(user : Principal, page : Nat, pageSize : Nat) : async [Principal] {
    switch (userFollowing.get(user)) {
      case (?following) {
        let arr = following.toArray();
        let start = page * pageSize;
        if (start >= arr.size()) { return [] };
        let end = if (start + pageSize > arr.size()) { arr.size() } else { start + pageSize };
        let resultArray = if (end > arr.size()) {
          arr.sliceToArray(start, arr.size());
        } else {
          arr.sliceToArray(start, end);
        };
        resultArray;
      };
      case (null) { [] };
    };
  };

  // -----------------------------------------------------------------------
  // Search
  // -----------------------------------------------------------------------
  /// Search users by username. No auth required.
  public query func searchUsers(searchQuery : Text, page : Nat, pageSize : Nat) : async [UserProfile] {
    let lowerQuery = searchQuery.toLower();
    let matched = userProfiles.toArray()
      .map(func((_, profile)) { profile })
      .filter(func(profile) { profile.username.toLower().contains(#text(lowerQuery)) });
    let start = page * pageSize;
    if (start >= matched.size()) { return [] };
    let end = if (start + pageSize > matched.size()) { matched.size() } else { start + pageSize };
    if (start >= matched.size()) { return [] };
    if (end > matched.size()) {
      matched.sliceToArray(start, matched.size());
    } else {
      matched.sliceToArray(start, end);
    };
  };

  /// Search posts by caption. No auth required.
  public query func searchPosts(searchQuery : Text, page : Nat, pageSize : Nat) : async [Post] {
    let lowerQuery = searchQuery.toLower();
    let matched = posts.toArray()
      .map(func((_, post)) { post })
      .filter(func(post) { post.caption.toLower().contains(#text(lowerQuery)) });
    let sorted = matched.sort(func(a, b) { Int.compare(b.createdAt, a.createdAt) });
    let start = page * pageSize;
    if (start >= sorted.size()) { return [] };
    let end = if (start + pageSize > sorted.size()) { sorted.size() } else { start + pageSize };
    if (start >= sorted.size()) { return [] };
    if (end > sorted.size()) {
      sorted.sliceToArray(start, sorted.size());
    } else {
      sorted.sliceToArray(start, end);
    };
  };

  // -----------------------------------------------------------------------
  // Visual Effects Feature
  // -----------------------------------------------------------------------
  /// Create a visual effect. Requires #user role.
  public shared ({ caller }) func createVisualEffect(name : Text, effectType : Text, intensity : Nat, previewUrl : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create visual effects");
    };
    let _visualEffect = {
      name;
      effectType;
      intensity = if (intensity >= 1 and intensity <= 10) { intensity } else { 1 };
      previewUrl;
    };
  };

  // -----------------------------------------------------------------------
  // Trending / Analytics (public queries)
  // -----------------------------------------------------------------------
  /// Get trending posts summary. No auth required.
  public query func getTrendingPosts() : async [{ postId : Nat; likesCount : Nat }] {
    trendingPosts.reverse().toArray().sort(
      func(a, b) {
        Nat.compare(a.likesCount, b.likesCount);
      }
    );
  };

  /// Get top hashtags. No auth required.
  public query func getTopHashtags() : async [Hashtag] {
    let hashtags = hashtagsMap.toArray().map(func((_, hashtag)) { hashtag });
    if (hashtags.size() >= 3) {
      hashtags.sort(Hashtag.compareByPostsCount);
    } else {
      hashtags;
    };
  };

  /// Get users who created most trending posts. No auth required.
  public query func getTopTrendingUsers() : async [UserWithTrendingPosts] {
    let trendingUsers = userTrendingPostsMap.toArray().map(func((_, user)) { user });
    if (trendingUsers.size() > 0) {
      trendingUsers.sort(UserWithTrendingPosts.compareByTrendingPostsCount);
    } else {
      [];
    };
  };

  /// Check if content is viral. No auth required.
  public query func isViral(contentId : Text, contentType : Text) : async Bool {
    switch (contentType, contentId.toNat()) {
      case ("post", ?postId) {
        switch (posts.get(postId)) {
          case (?post) {
            return post.likesCount >= 100 and post.commentsCount >= 50;
          };
          case (null) {
            return false;
          };
        };
      };
      case ("hashtag", ?_) {
        return false;
      };
      case (_, _) {
        return false;
      };
    };
  };

  /// Get engagement rate for content. No auth required.
  public query func getEngagementRate(contentId : Text, contentType : Text) : async Float {
    var engagementRate = 0.0;
    switch (contentType, contentId.toNat()) {
      case ("post", ?postId) {
        switch (posts.get(postId)) {
          case (?post) {
            if (post.likesCount == 0 and post.commentsCount == 0) {
              engagementRate := 0.0;
            } else {
              engagementRate := (post.commentsCount.toFloat() * 100.0) / (post.likesCount.toFloat() + 1.0);
            };
          };
          case (null) {};
        };
      };
      case ("user", ?_) {};
      case (_, _) {};
    };
    engagementRate;
  };

  /// Get trending features. No auth required.
  public query func getTrendingFeatures() : async ?[SocialFeature] {
    let features = socialFeaturesMap.toArray().map(func((_, feature)) { feature });
    if (features.size() > 0) {
      ?features;
    } else {
      null;
    };
  };

  /// Get related features. No auth required.
  public query func getRelatedFeatures(featureName : Text) : async ?[SocialFeature] {
    switch (socialFeaturesMap.get(featureName)) {
      case (?_) {
        let relatedFeatures = socialFeaturesMap.toArray().map(func((_, feature)) { feature });
        if (relatedFeatures.size() > 0) {
          ?relatedFeatures;
        } else {
          null;
        };
      };
      case (null) {
        null;
      };
    };
  };

  /// Get feature details. No auth required.
  public query func getFeatureDetails(featureName : Text) : async ?SocialFeature {
    socialFeaturesMap.get(featureName);
  };

  // -----------------------------------------------------------------------
  // Utility
  // -----------------------------------------------------------------------
  func tokensToHashtags(tokens : [Text]) : [Text] {
    let hashtags = tokens.filter(
      func(token) {
        token.startsWith(#text("#")) and token.size() > 1
      }
    );
    hashtags;
  };
};
