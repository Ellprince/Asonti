import { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Camera, Upload, User, AlertTriangle } from 'lucide-react';

interface PhotoUploadStepProps {
  currentPhoto?: string;
  onPhotoChange: (photo: string) => void;
}

// Generate a consistent avatar placeholder based on a seed
const generateAvatarPlaceholder = (seed: string = 'default') => {
  const avatars = ['🌟', '✨', '🚀', '💫', '🌈', '🎯', '💡', '🔥', '⭐', '🌺'];
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
  ];
  
  const avatarIndex = seed.length % avatars.length;
  const colorIndex = seed.length % colors.length;
  
  return {
    emoji: avatars[avatarIndex],
    background: colors[colorIndex]
  };
};

// Check if localStorage has enough space (rough estimate)
const checkLocalStorageSpace = () => {
  try {
    const testKey = 'storage-test';
    const testData = new Array(1024 * 10).join('a'); // 10KB test
    localStorage.setItem(testKey, testData);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

export function PhotoUploadStep({ currentPhoto, onPhotoChange }: PhotoUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [isSimulatedPhoto, setIsSimulatedPhoto] = useState(false);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        
        // Check if we have storage space
        if (!checkLocalStorageSpace()) {
          // Generate a simulated photo instead
          const avatar = generateAvatarPlaceholder(file.name + file.size);
          const simulatedPhoto = `simulated-avatar:${avatar.emoji}:${avatar.background}`;
          
          setStorageWarning(true);
          setIsSimulatedPhoto(true);
          onPhotoChange(simulatedPhoto);
          
          // Hide warning after 5 seconds
          setTimeout(() => setStorageWarning(false), 5000);
        } else {
          try {
            // Try to store the actual image
            onPhotoChange(result);
            setIsSimulatedPhoto(false);
          } catch (error) {
            // If storage fails, fallback to simulated photo
            const avatar = generateAvatarPlaceholder(file.name + file.size);
            const simulatedPhoto = `simulated-avatar:${avatar.emoji}:${avatar.background}`;
            
            setStorageWarning(true);
            setIsSimulatedPhoto(true);
            onPhotoChange(simulatedPhoto);
            
            setTimeout(() => setStorageWarning(false), 5000);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Check if current photo is simulated
  const isCurrentPhotoSimulated = currentPhoto?.startsWith('simulated-avatar:');
  
  const renderPhoto = () => {
    if (!currentPhoto) return null;
    
    if (isCurrentPhotoSimulated) {
      const [, emoji, background] = currentPhoto.split(':');
      return (
        <div 
          className="w-48 h-48 rounded-full border-4 border-primary mb-6 mx-auto flex items-center justify-center text-6xl"
          style={{ background: decodeURIComponent(background) }}
        >
          {emoji}
        </div>
      );
    }
    
    return (
      <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-primary mb-6 mx-auto">
        <img
          src={currentPhoto}
          alt="Your photo"
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full p-6">
      <div className="text-center mb-8">
        <h2 className="mb-4">Add Your Photo</h2>
        <p className="text-muted-foreground">
          Upload a clear photo of yourself to get started. This will help create a personalized experience.
        </p>
      </div>

      {/* Storage Warning */}
      {storageWarning && (
        <div className="mb-4 p-3 bg-orange-100 dark:bg-orange-900 border border-orange-200 dark:border-orange-800 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <div className="font-medium text-orange-800 dark:text-orange-200">Storage limit reached</div>
            <div className="text-orange-700 dark:text-orange-300">
              We've created a personalized avatar for you instead. Your profile will work perfectly!
            </div>
          </div>
        </div>
      )}

      {/* Photo Upload Area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {currentPhoto ? (
          // Show uploaded photo or simulated avatar
          <div className="text-center">
            {renderPhoto()}
            <div className="space-y-2">
              <Button variant="outline" onClick={triggerFileInput}>
                <Upload className="w-4 h-4 mr-2" />
                Change Photo
              </Button>
              {isCurrentPhotoSimulated && (
                <p className="text-xs text-muted-foreground">
                  Personalized avatar created due to storage limitations
                </p>
              )}
            </div>
          </div>
        ) : (
          // Upload area
          <div
            className={`w-full max-w-sm border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragOver
                ? 'border-primary bg-accent'
                : 'border-border hover:border-primary hover:bg-accent'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={triggerFileInput}
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2">Upload your photo</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop an image, or click to browse
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
              <Button variant="ghost" size="sm">
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
    </div>
  );
}