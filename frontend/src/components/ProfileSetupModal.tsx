import { useState, useRef } from 'react';
import { useRegisterUser } from '../hooks/useQueries';
import { ExternalBlob } from '../backend';
import { toast } from 'sonner';
import { Camera, ArrowRight, ArrowLeft, Check, User, FileText, ImagePlus, Zap } from 'lucide-react';

type Step = 1 | 2 | 3;

const STEP_CONFIG = [
  { id: 1, label: 'Username', icon: User },
  { id: 2, label: 'Bio', icon: FileText },
  { id: 3, label: 'Photo', icon: Camera },
];

export default function ProfileSetupModal() {
  const [step, setStep] = useState<Step>(1);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [usernameError, setUsernameError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const registerUser = useRegisterUser();

  const validateUsername = (val: string): string => {
    if (!val.trim()) return 'Username is required';
    if (val.length < 3) return 'Must be at least 3 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(val)) return 'Only letters, numbers, and underscores';
    return '';
  };

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

  const handleNext = () => {
    if (step === 1) {
      const err = validateUsername(username);
      if (err) {
        setUsernameError(err);
        return;
      }
      setUsernameError('');
    }
    if (step < 3) setStep((s) => (s + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleFinish = async () => {
    const err = validateUsername(username);
    if (err) {
      setUsernameError(err);
      setStep(1);
      return;
    }

    try {
      let profilePicture: ExternalBlob | null = null;
      if (avatarFile) {
        const bytes = new Uint8Array(await avatarFile.arrayBuffer());
        profilePicture = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) => {
          setUploadProgress(pct);
        });
      }
      await registerUser.mutateAsync({ username: username.trim(), bio: bio.trim(), profilePicture });
      toast.success('Welcome to VibeStream! 🎉');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Username already exists')) {
        toast.error('Username already taken. Try another one!');
        setStep(1);
      } else {
        toast.error('Failed to create profile. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-vibe-black overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-80 h-80 rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, #8A2BE2, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #00FFFF, transparent 70%)' }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex flex-col items-center pt-12 pb-6 px-6">
        <div className="flex items-center gap-2 mb-6">
          <img
            src="/assets/generated/vibestream-logo.dim_512x512.png"
            alt="VibeStream"
            className="w-8 h-8 rounded-xl"
          />
          <span className="font-display font-bold text-white text-lg">VibeStream</span>
        </div>

        <h2 className="font-display text-2xl font-bold text-white text-center">
          {step === 1 && 'Choose your username'}
          {step === 2 && 'Tell us about yourself'}
          {step === 3 && 'Add a profile photo'}
        </h2>
        <p className="text-muted-foreground text-sm mt-1 text-center">
          {step === 1 && 'This is how others will find you'}
          {step === 2 && 'A short bio helps people know you'}
          {step === 3 && 'Optional — you can always add one later'}
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-6">
          {STEP_CONFIG.map((s, i) => {
            const StepIcon = s.icon;
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300"
                  style={{
                    background: isDone
                      ? 'linear-gradient(135deg, #8A2BE2, #6a1fb5)'
                      : isActive
                      ? 'rgba(138,43,226,0.2)'
                      : 'rgba(255,255,255,0.05)',
                    border: isActive
                      ? '2px solid #8A2BE2'
                      : isDone
                      ? '2px solid #8A2BE2'
                      : '2px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {isDone ? (
                    <Check size={14} className="text-white" />
                  ) : (
                    <StepIcon size={14} style={{ color: isActive ? '#8A2BE2' : 'rgba(255,255,255,0.3)' }} />
                  )}
                </div>
                {i < STEP_CONFIG.length - 1 && (
                  <div
                    className="w-8 h-0.5 rounded-full transition-all duration-500"
                    style={{ background: isDone ? '#8A2BE2' : 'rgba(255,255,255,0.1)' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="relative z-10 flex-1 flex flex-col px-6 overflow-y-auto">
        {/* Step 1: Username */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-fade-in-up">
            <div className="glass-card rounded-2xl p-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-vibe-purple font-bold text-lg">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    setUsername(val);
                    if (usernameError) setUsernameError(validateUsername(val));
                  }}
                  placeholder="your_username"
                  maxLength={30}
                  autoFocus
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-secondary border text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors text-base"
                  style={{ borderColor: usernameError ? '#ef4444' : username ? '#8A2BE2' : 'rgba(255,255,255,0.1)' }}
                />
              </div>
              {usernameError ? (
                <p className="text-xs mt-2" style={{ color: '#ef4444' }}>{usernameError}</p>
              ) : username.length >= 3 ? (
                <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#00FFFF' }}>
                  <Check size={12} /> Looks good!
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">{username.length}/30 characters</p>
              )}
            </div>

            <div className="glass-card rounded-2xl p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your username is unique and permanent. Choose something that represents you — it's how the VibeStream community will know you.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Bio */}
        {step === 2 && (
          <div className="flex flex-col gap-4 animate-fade-in-up">
            <div className="glass-card rounded-2xl p-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the world about yourself... 🌟"
                maxLength={150}
                rows={4}
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-vibe-purple transition-colors resize-none text-base leading-relaxed"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-muted-foreground">Optional</span>
                <span
                  className="text-xs"
                  style={{ color: bio.length > 130 ? '#ff6b9d' : 'rgba(255,255,255,0.3)' }}
                >
                  {bio.length}/150
                </span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                A great bio helps people decide to follow you. Share your interests, what you create, or just a fun fact about yourself.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Avatar */}
        {step === 3 && (
          <div className="flex flex-col items-center gap-5 animate-fade-in-up">
            <div className="relative">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-32 h-32 rounded-full overflow-hidden transition-all duration-200 group"
                style={{
                  border: '3px solid',
                  borderColor: avatarPreview ? '#8A2BE2' : 'rgba(255,255,255,0.15)',
                  boxShadow: avatarPreview ? '0 0 30px rgba(138,43,226,0.4)' : 'none',
                }}
              >
                <img
                  src={avatarPreview || '/assets/generated/default-avatar.dim_256x256.png'}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                  <ImagePlus size={20} className="text-white" />
                  <span className="text-white text-xs font-medium">Change</span>
                </div>
              </button>
              {!avatarPreview && (
                <div
                  className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #8A2BE2, #6a1fb5)' }}
                >
                  <Camera size={16} className="text-white" />
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="glass-card rounded-2xl px-6 py-3 flex items-center gap-2 transition-all duration-200 hover:border-vibe-purple"
              style={{ borderColor: 'rgba(138,43,226,0.3)' }}
            >
              <ImagePlus size={16} style={{ color: '#8A2BE2' }} />
              <span className="text-sm font-medium text-white">
                {avatarPreview ? 'Change Photo' : 'Upload Photo'}
              </span>
            </button>

            {/* Upload progress */}
            {registerUser.isPending && uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full flex flex-col gap-2">
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #8A2BE2, #00FFFF)' }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">Uploading... {uploadProgress}%</p>
              </div>
            )}

            <div className="glass-card rounded-2xl p-4 w-full">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                A profile photo helps people recognize you. You can always update it later from your profile settings.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="relative z-10 flex flex-col gap-3 px-6 pb-10 pt-4">
        {step === 3 ? (
          <button
            onClick={handleFinish}
            disabled={registerUser.isPending}
            className="w-full py-4 rounded-2xl font-display font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #8A2BE2, #6a1fb5)',
              boxShadow: '0 0 30px rgba(138, 43, 226, 0.4)',
            }}
          >
            {registerUser.isPending ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating your profile...</span>
              </>
            ) : (
              <>
                <Zap size={18} />
                <span>Join VibeStream 🚀</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-2xl font-display font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #8A2BE2, #6a1fb5)',
              boxShadow: '0 0 30px rgba(138, 43, 226, 0.4)',
            }}
          >
            <span>Continue</span>
            <ArrowRight size={18} />
          </button>
        )}

        <div className="flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={handleBack}
              disabled={registerUser.isPending}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors disabled:opacity-40"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : (
            <div />
          )}

          {step === 3 && (
            <button
              onClick={handleFinish}
              disabled={registerUser.isPending}
              className="text-sm text-muted-foreground hover:text-white transition-colors disabled:opacity-40"
            >
              Skip for now
            </button>
          )}

          {step < 3 && step === 2 && (
            <button
              onClick={handleNext}
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
