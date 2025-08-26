import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Sparkles, Download, Share2 } from 'lucide-react';

interface WizardData {
  photo?: string;
  attributes: Record<string, 'have_now' | 'want_to_develop' | 'not_me'>;
  hope?: string;
  fear?: string;
  currentValues?: string[];
  futureValues?: string[];
  feelings?: string;
  dayInLife?: string;
}

interface CompletionStepProps {
  wizardData: WizardData;
  onComplete: () => void;
}

export function CompletionStep({ wizardData, onComplete }: CompletionStepProps) {
  // Ensure we have valid data structures
  const safeWizardData = {
    photo: wizardData?.photo,
    attributes: wizardData?.attributes || {},
    hope: wizardData?.hope,
    fear: wizardData?.fear,
    currentValues: Array.isArray(wizardData?.currentValues) ? wizardData.currentValues : [],
    futureValues: Array.isArray(wizardData?.futureValues) ? wizardData.futureValues : [],
    feelings: wizardData?.feelings,
    dayInLife: wizardData?.dayInLife,
  };

  // Render avatar based on photo type
  const renderAvatar = () => {
    if (!safeWizardData.photo) {
      // Default avatar
      const avatarStyle: React.CSSProperties = {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '50%',
        width: '120px',
        height: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '48px',
        color: 'white',
        margin: '0 auto'
      };
      
      return (
        <div style={avatarStyle}>
          🌟
        </div>
      );
    }

    if (safeWizardData.photo.startsWith('simulated-avatar:')) {
      // Simulated avatar
      const [, emoji, background] = safeWizardData.photo.split(':');
      return (
        <div 
          className="w-30 h-30 rounded-full mx-auto flex items-center justify-center text-5xl"
          style={{ 
            background: decodeURIComponent(background),
            width: '120px',
            height: '120px'
          }}
        >
          {emoji}
        </div>
      );
    }

    // Real photo
    return (
      <div className="w-30 h-30 rounded-full overflow-hidden mx-auto" style={{ width: '120px', height: '120px' }}>
        <img
          src={safeWizardData.photo}
          alt="Your photo"
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  // Calculate attribute stats safely
  const attributeStats = {
    haveNow: Object.values(safeWizardData.attributes).filter(v => v === 'have_now').length,
    wantToDevelop: Object.values(safeWizardData.attributes).filter(v => v === 'want_to_develop').length,
    notMe: Object.values(safeWizardData.attributes).filter(v => v === 'not_me').length,
  };

  const exportData = () => {
    const photoType = safeWizardData.photo?.startsWith('simulated-avatar:') ? 'Personalized Avatar' : 
                     safeWizardData.photo ? 'Personal Photo' : 'Default Avatar';
    
    const exportText = `
MY FUTURE SELF PROFILE
=====================

PROFILE PHOTO: ${photoType}

CHARACTER STRENGTHS:
- Have Now: ${attributeStats.haveNow} attributes
- Want to Develop: ${attributeStats.wantToDevelop} attributes
- Not Me: ${attributeStats.notMe} attributes

HOPES & FEARS:
Hope: ${safeWizardData.hope || 'Not specified'}
Fear: ${safeWizardData.fear || 'Not specified'}

VALUES:
Current Values: ${safeWizardData.currentValues.join(', ') || 'None selected'}
Future Values: ${safeWizardData.futureValues.join(', ') || 'None selected'}

FEELINGS ABOUT MY FUTURE SELF:
${safeWizardData.feelings || 'Not specified'}

A DAY IN MY FUTURE LIFE:
${safeWizardData.dayInLife || 'Not specified'}

Created: ${new Date().toLocaleDateString()}
    `.trim();

    try {
      const blob = new Blob([exportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-future-self-profile.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Sorry, there was an error exporting your profile. Please try again.');
    }
  };

  const handleShare = () => {
    // Placeholder for sharing functionality
    alert('Sharing feature coming soon!');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 text-center border-b border-border">
        <div className="mb-4">
          {renderAvatar()}
        </div>
        <h1 className="mb-2">Your Future Self Profile</h1>
        <p className="text-muted-foreground">
          Congratulations! You've created a comprehensive vision of your future self.
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Character Strengths Summary */}
          <Card className="p-4">
            <h3 className="mb-3">Character Strengths Overview</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <div className="text-xl font-semibold">{attributeStats.haveNow}</div>
                <div className="text-xs text-muted-foreground">Have Now</div>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <div className="text-xl font-semibold">{attributeStats.wantToDevelop}</div>
                <div className="text-xs text-muted-foreground">Want to Develop</div>
              </div>
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="text-xl font-semibold">{attributeStats.notMe}</div>
                <div className="text-xs text-muted-foreground">Not Me</div>
              </div>
            </div>
          </Card>

          {/* Values */}
          {(safeWizardData.currentValues.length > 0 || safeWizardData.futureValues.length > 0) && (
            <Card className="p-4">
              <h3 className="mb-3">Core Values</h3>
              <div className="space-y-3">
                {safeWizardData.currentValues.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Values I Have Now</div>
                    <div className="flex flex-wrap gap-1">
                      {safeWizardData.currentValues.map((value, index) => (
                        <Badge key={`current-${index}-${value}`} variant="secondary">{value}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {safeWizardData.futureValues.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Values I Want to Develop</div>
                    <div className="flex flex-wrap gap-1">
                      {safeWizardData.futureValues.map((value, index) => (
                        <Badge key={`future-${index}-${value}`} variant="outline">{value}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Hope & Fear */}
          {(safeWizardData.hope || safeWizardData.fear) && (
            <Card className="p-4">
              <h3 className="mb-3">Vision & Concerns</h3>
              <div className="space-y-4">
                {safeWizardData.hope && (
                  <div>
                    <div className="text-sm font-medium mb-2 text-green-600 dark:text-green-400">Hope for the Future</div>
                    <p className="text-sm text-muted-foreground">{safeWizardData.hope}</p>
                  </div>
                )}
                {safeWizardData.hope && safeWizardData.fear && <Separator />}
                {safeWizardData.fear && (
                  <div>
                    <div className="text-sm font-medium mb-2 text-orange-600 dark:text-orange-400">Fear to Avoid</div>
                    <p className="text-sm text-muted-foreground">{safeWizardData.fear}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Feelings */}
          {safeWizardData.feelings && (
            <Card className="p-4">
              <h3 className="mb-3">Emotional Connection</h3>
              <p className="text-sm text-muted-foreground">{safeWizardData.feelings}</p>
            </Card>
          )}

          {/* Day in Life */}
          {safeWizardData.dayInLife && (
            <Card className="p-4">
              <h3 className="mb-3">A Day in Your Future Life</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{safeWizardData.dayInLife}</p>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="p-6 border-t border-border space-y-3">
        <div className="flex gap-2">
          <Button onClick={exportData} variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Export Profile
          </Button>
          <Button onClick={handleShare} variant="outline" className="flex-1">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
        <Button onClick={onComplete} className="w-full">
          <Sparkles className="w-4 h-4 mr-2" />
          Complete & Save Profile
        </Button>
      </div>
    </div>
  );
}