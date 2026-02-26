import { useState, useRef } from 'react';
import { Upload, X, Film, Image, Hash } from 'lucide-react';
import { useCreatePost } from '../hooks/useQueries';
import { ExternalBlob, MediaType } from '../backend';
import { toast } from 'sonner';

interface UploadViewProps {
  onUploadSuccess: () => void;
}

export default function UploadView({ onUploadSuccess }: UploadViewProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>(MediaType.video);
  const [caption, setCaption] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      setError('Please select a video or image file');
      return;
    }

    if (isVideo) {
      // Validate video duration
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = url;
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          if (video.duration > 180) {
            setError('Videos must be 3 minutes or shorter');
            URL.revokeObjectURL(url);
            resolve();
            return;
          }
          setSelectedFile(file);
          setPreviewUrl(url);
          setMediaType(MediaType.video);
          resolve();
        };
        video.onerror = () => {
          setError('Could not read video file');
          URL.revokeObjectURL(url);
          resolve();
        };
      });
    } else {
      const url = URL.createObjectURL(file);
      setSelectedFile(file);
      setPreviewUrl(url);
      setMediaType(MediaType.photo);
    }
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const extractHashtags = (text: string): string[] => {
    const matches = text.match(/#[a-zA-Z0-9_]+/g);
    return matches || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setUploadProgress(0);
      const bytes = new Uint8Array(await selectedFile.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) => {
        setUploadProgress(pct);
      });
      const hashtags = extractHashtags(caption);

      await createPost.mutateAsync({
        mediaFile: blob,
        mediaType,
        caption: caption.trim(),
        hashtags,
      });

      toast.success('Post uploaded! 🎉');
      handleClear();
      onUploadSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || 'Upload failed. Please try again.');
      setUploadProgress(0);
    }
  };

  return (
    <div className="h-dvh bg-vibe-black flex flex-col overflow-y-auto scrollbar-hide pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <h1 className="font-display text-2xl font-bold text-white">New Post</h1>
        {selectedFile && (
          <button onClick={handleClear} className="w-9 h-9 rounded-full glass-card flex items-center justify-center">
            <X size={18} color="white" />
          </button>
        )}
      </div>

      <div className="flex-1 px-5 flex flex-col gap-5">
        {/* File selector or preview */}
        {!selectedFile ? (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[9/16] max-h-80 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all duration-200"
              style={{ borderColor: 'rgba(138, 43, 226, 0.4)', background: 'rgba(138, 43, 226, 0.05)' }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(138, 43, 226, 0.2)' }}
              >
                <Upload size={28} color="#8A2BE2" />
              </div>
              <div className="text-center">
                <p className="font-display font-semibold text-white">Select Media</p>
                <p className="text-muted-foreground text-sm mt-1">Video (max 3 min) or Photo</p>
              </div>
            </button>

            {/* Type indicators */}
            <div className="flex gap-3">
              <div className="flex-1 glass-card rounded-2xl p-3 flex items-center gap-2">
                <Film size={18} color="#8A2BE2" />
                <span className="text-sm text-muted-foreground">Video</span>
              </div>
              <div className="flex-1 glass-card rounded-2xl p-3 flex items-center gap-2">
                <Image size={18} color="#00FFFF" />
                <span className="text-sm text-muted-foreground">Photo</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative rounded-3xl overflow-hidden bg-black aspect-[9/16] max-h-80">
            {mediaType === MediaType.video ? (
              <video
                src={previewUrl!}
                className="w-full h-full object-cover"
                controls
                muted
                playsInline
              />
            ) : (
              <img
                src={previewUrl!}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute top-3 left-3">
              <span
                className="px-2 py-1 rounded-full text-xs font-medium text-white"
                style={{ background: mediaType === MediaType.video ? 'rgba(138, 43, 226, 0.8)' : 'rgba(0, 255, 255, 0.3)', color: mediaType === MediaType.video ? 'white' : '#00FFFF' }}
              >
                {mediaType === MediaType.video ? '🎬 Video' : '📸 Photo'}
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-destructive/20 border border-destructive/30">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Caption */}
        {selectedFile && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Hash size={14} color="#8A2BE2" />
                Caption & Hashtags
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption... #vibestream #trending"
                maxLength={500}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-vibe-purple transition-colors resize-none text-sm"
              />
              <span className="text-xs text-muted-foreground text-right">{caption.length}/500</span>
            </div>

            {/* Upload progress */}
            {createPost.isPending && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${uploadProgress}%`,
                      background: 'linear-gradient(90deg, #8A2BE2, #00FFFF)',
                    }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={createPost.isPending}
              className="w-full py-4 rounded-2xl font-display font-semibold text-white transition-all duration-200 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8A2BE2, #6a1fb5)' }}
            >
              {createPost.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading...
                </span>
              ) : (
                'Share Post 🚀'
              )}
            </button>
          </form>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
