import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { useUpdateProfile } from '../hooks/useQueries';
import { ExternalBlob } from '../backend';
import type { UserProfile } from '../backend';
import { toast } from 'sonner';

interface EditProfileModalProps {
  currentProfile: UserProfile;
  onClose: () => void;
}

export default function EditProfileModal({ currentProfile, onClose }: EditProfileModalProps) {
  const [username, setUsername] = useState(currentProfile.username);
  const [bio, setBio] = useState(currentProfile.bio);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateProfile = useUpdateProfile();

  const currentAvatarUrl = currentProfile.profilePicture
    ? currentProfile.profilePicture.getDirectURL()
    : '/assets/generated/default-avatar.dim_256x256.png';

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Username is required');
      return;
    }
    if (username.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      toast.error('Username can only contain letters, numbers, and underscores');
      return;
    }

    try {
      let profilePicture: ExternalBlob | null = null;
      if (avatarFile) {
        const bytes = new Uint8Array(await avatarFile.arrayBuffer());
        profilePicture = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) => {
          setUploadProgress(pct);
        });
      } else if (currentProfile.profilePicture) {
        profilePicture = currentProfile.profilePicture;
      }

      await updateProfile.mutateAsync({
        username: username.trim(),
        bio: bio.trim(),
        profilePicture,
      });

      toast.success('Profile updated! ✨');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Username already taken')) {
        toast.error('Username already taken. Try another one!');
      } else {
        toast.error('Failed to update profile. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="glass-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up sm:animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold text-white">Edit Profile</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full glass-card flex items-center justify-center"
          >
            <X size={18} color="white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full overflow-hidden border-2 transition-all duration-200"
              style={{ borderColor: '#8A2BE2' }}
            >
              <img
                src={avatarPreview || currentAvatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-medium">Change</span>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">Tap to change photo</p>
          </div>

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                }
                maxLength={30}
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-vibe-purple transition-colors"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the world about yourself..."
              maxLength={150}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-vibe-purple transition-colors resize-none text-sm"
            />
            <span className="text-xs text-muted-foreground text-right">{bio.length}/150</span>
          </div>

          {/* Upload progress */}
          {updateProfile.isPending && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="flex flex-col gap-1">
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${uploadProgress}%`,
                    background: 'linear-gradient(90deg, #8A2BE2, #00FFFF)',
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl font-medium text-sm text-white glass-card border border-white/20 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateProfile.isPending || !username.trim()}
              className="flex-1 py-3 rounded-2xl font-semibold text-sm text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #8A2BE2, #6a1fb5)' }}
            >
              {updateProfile.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
