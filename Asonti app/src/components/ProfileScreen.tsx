import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Sparkles, Share2, ChevronDown, ChevronUp, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FutureSelfWizard, type WizardData } from './FutureSelfWizard';
import { ScrollArea } from './ui/scroll-area';
import { futureSelfService } from '@/services/futureSelfService';
import { profileHistory } from '@/services/profileHistoryService';
import { supabase } from '@/lib/supabase';
import type { FutureSelfProfile } from '@/lib/supabase';
import { OnboardingMessage } from './OnboardingMessage';

// Character strengths mapping from AttributesStep
const CHARACTER_STRENGTHS: Record<string, { title: string; description: string; category: string }> = {
  // Wisdom & Knowledge
  creativity: { title: 'Creativity', description: 'Thinking of novel and productive ways to conceptualize and do things', category: 'Wisdom & Knowledge' },
  curiosity: { title: 'Curiosity', description: 'Taking an interest in ongoing experience for its own sake; exploring and discovering', category: 'Wisdom & Knowledge' },
  judgment: { title: 'Judgment', description: 'Thinking things through and examining them from all sides; weighing all evidence fairly', category: 'Wisdom & Knowledge' },
  love_of_learning: { title: 'Love of Learning', description: 'Mastering new skills, topics, and bodies of knowledge, whether on one\'s own or formally', category: 'Wisdom & Knowledge' },
  perspective: { title: 'Perspective', description: 'Being able to provide wise counsel to others; having ways of looking at the world that make sense', category: 'Wisdom & Knowledge' },
  
  // Courage
  bravery: { title: 'Bravery', description: 'Not shrinking from threat, challenge, difficulty, or pain; acting on convictions even if unpopular', category: 'Courage' },
  perseverance: { title: 'Perseverance', description: 'Persisting in a course of action in spite of being fatigued or discouraged', category: 'Courage' },
  honesty: { title: 'Honesty', description: 'Speaking the truth but more broadly presenting oneself in a genuine way and acting in a sincere way', category: 'Courage' },
  zest: { title: 'Zest', description: 'Approaching life with excitement and energy; living life as an adventure; feeling alive and activated', category: 'Courage' },
  
  // Humanity
  love: { title: 'Love', description: 'Capacity for close relationships with others; valuing close relationships with others', category: 'Humanity' },
  kindness: { title: 'Kindness', description: 'Doing favors and good deeds for others; helping them; taking care of them', category: 'Humanity' },
  social_intelligence: { title: 'Social Intelligence', description: 'Understanding the motives and feelings of other people and oneself; acting appropriately in social situations', category: 'Humanity' },
  
  // Justice
  teamwork: { title: 'Teamwork', description: 'Excelling as a member of a group or team; being a good citizen; doing one\'s share', category: 'Justice' },
  fairness: { title: 'Fairness', description: 'Treating all people the same according to notions of fairness and justice; giving everyone a fair chance', category: 'Justice' },
  leadership: { title: 'Leadership', description: 'Encouraging a group to get things done while maintaining good relations within the group', category: 'Justice' },
  
  // Temperance
  forgiveness: { title: 'Forgiveness', description: 'Forgiving those who have done wrong; accepting others\' shortcomings; giving people a second chance', category: 'Temperance' },
  humility: { title: 'Humility', description: 'Letting one\'s accomplishments speak for themselves; not regarding oneself as more special than others', category: 'Temperance' },
  prudence: { title: 'Prudence', description: 'Being careful about one\'s choices; not taking undue risks; not saying or doing things that might later be regretted', category: 'Temperance' },
  self_regulation: { title: 'Self-Regulation', description: 'Regulating what one feels and does; being self-disciplined; controlling appetites and emotions', category: 'Temperance' },
  
  // Transcendence
  appreciation_of_beauty: { title: 'Appreciation of Beauty & Excellence', description: 'Noticing and appreciating beauty, excellence, and skilled performance in various domains of life', category: 'Transcendence' },
  gratitude: { title: 'Gratitude', description: 'Being aware of and thankful for good things; taking time to express thanks', category: 'Transcendence' },
  hope: { title: 'Hope', description: 'Expecting the best in the future and working to achieve it; believing that a good future is something that can be brought about', category: 'Transcendence' },
  humor: { title: 'Humor', description: 'Liking to laugh and tease; bringing smiles to other people; seeing the light side', category: 'Transcendence' },
  spirituality: { title: 'Spirituality', description: 'Having coherent beliefs about higher purpose and meaning; having beliefs that shape actions and provide comfort', category: 'Transcendence' },
};

interface FutureSelfData {
  hasProfile: boolean;
  createdAt?: string;
  photo?: string;
  attributes?: Record<string, 'have_now' | 'want_to_develop' | 'not_me'>;
  hope?: string;
  fear?: string;
  currentValues?: string[];
  futureValues?: string[];
  feelings?: string;
  dayInLife?: string;
}

interface ProfileScreenProps {
  showOnboarding?: boolean;
}

export function ProfileScreen({ showOnboarding = false }: ProfileScreenProps) {
  const [futureSelf, setFutureSelf] = useState<FutureSelfData>({ hasProfile: false });
  const [profile, setProfile] = useState<FutureSelfProfile | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStrengthsExpanded, setIsStrengthsExpanded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showOnboardingMsg, setShowOnboardingMsg] = useState(showOnboarding);
  const [versionInfo, setVersionInfo] = useState<{
    version: number;
    lastUpdated: string;
    historyCount: number;
  }>({ version: 1, lastUpdated: '', historyCount: 0 });

  // Update onboarding message visibility when prop changes
  useEffect(() => {
    setShowOnboardingMsg(showOnboarding);
  }, [showOnboarding]);

  // Load future self data from database
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Check if user is authenticated first
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('No active session, user needs to log in');
          setFutureSelf({ hasProfile: false });
          setError('Please sign in to view your profile');
          return;
        }

        const profileData = await futureSelfService.getActiveProfile();
        if (profileData) {
          setProfile(profileData);
          setFutureSelf({
            hasProfile: true,
            createdAt: profileData.created_at,
            photo: profileData.photo_url,
            attributes: profileData.attributes || {},
            hope: profileData.hope,
            fear: profileData.fear,
            currentValues: Array.isArray(profileData.current_values) ? profileData.current_values : [],
            futureValues: Array.isArray(profileData.future_values) ? profileData.future_values : [],
            feelings: profileData.feelings,
            dayInLife: profileData.day_in_life,
          });
        } else {
          // No profile found
          setFutureSelf({ hasProfile: false });
        }
      } catch (error) {
        console.error('Error loading future self data:', error);
        setError('Failed to load profile. Please check your connection and try again.');
        // No localStorage fallback - show error to user instead
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [retryCount]);

  // Fetch version info when profile loads
  useEffect(() => {
    const fetchVersionInfo = async () => {
      if (profile?.id) {
        const count = await profileHistory.getHistoryCount(profile.id);
        setVersionInfo({
          version: profile.version_number || 1,
          lastUpdated: profile.updated_at 
            ? new Date(profile.updated_at).toLocaleDateString()
            : 'Never',
          historyCount: count
        });
      }
    };
    
    fetchVersionInfo();
  }, [profile]);

  // Reload profile data from database
  const reloadProfile = () => {
    setRetryCount(prev => prev + 1);
  };

  const handleWizardComplete = async (wizardData: WizardData) => {
    try {
      // Profile has already been saved to Supabase by wizard component
      // Update local state only (no localStorage)
      const updatedFutureSelf = {
        hasProfile: true,
        createdAt: new Date().toISOString(),
        photo: wizardData.photo,
        attributes: wizardData.attributes,
        hope: wizardData.hope,
        fear: wizardData.fear,
        currentValues: wizardData.currentValues,
        futureValues: wizardData.futureValues,
        feelings: wizardData.feelings,
        dayInLife: wizardData.dayInLife,
      };
      
      setFutureSelf(updatedFutureSelf);
      
      // No localStorage save - data is in Supabase
      
      setShowWizard(false);
      
      // Reload profile to get latest data from database
      reloadProfile();
    } catch (error) {
      console.error('Error completing wizard:', error);
      alert('Your profile was created but there was an error saving it. It may not persist between sessions.');
    }
  };

  const handleWizardCancel = () => {
    setShowWizard(false);
  };

  const handleStartWizard = () => {
    setShowWizard(true);
  };

  const handleResetProfile = async () => {
    if (window.confirm('Are you sure you want to reset your profile? This cannot be undone.')) {
      try {
        setIsLoading(true);
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Please sign in to reset your profile');
          return;
        }
        
        // Delete profile from Supabase
        const { error } = await supabase
          .from('future_self_profiles')
          .delete()
          .eq('user_id', session.user.id);
        
        if (error) {
          throw error;
        }
        
        // Reset local state
        setFutureSelf({ hasProfile: false });
        setProfile(null);
      } catch (error) {
        console.error('Error resetting profile:', error);
        alert('There was an error resetting your profile. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleShareProfile = async () => {
    try {
      // Create a summary of the profile for sharing
      const profileSummary = `My Future Self Profile 🌟

${futureSelf.currentValues && futureSelf.currentValues.length > 0 ? 
  `Current Values: ${futureSelf.currentValues.join(', ')}` : ''}

${futureSelf.futureValues && futureSelf.futureValues.length > 0 ? 
  `Future Values: ${futureSelf.futureValues.join(', ')}` : ''}

${futureSelf.hope ? `A hope for my future: ${futureSelf.hope}` : ''}

${futureSelf.feelings ? `How I feel about my future self: ${futureSelf.feelings}` : ''}

Created with Asonti - Your thinking partner`;

      if (navigator.share) {
        // Use native share API if available
        await navigator.share({
          title: 'My Future Self Profile',
          text: profileSummary,
        });
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(profileSummary);
        alert('Profile copied to clipboard! You can now paste it anywhere to share.');
      }
    } catch (error) {
      console.error('Error sharing profile:', error);
      alert('Unable to share at this time. Please try again.');
    }
  };

  // Render photo or avatar
  const renderProfilePhoto = () => {
    if (!futureSelf.photo) {
      // Default avatar
      const avatarStyle: React.CSSProperties = {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '50%',
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        color: 'white',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      };
      
      return (
        <div style={avatarStyle}>
          🌟
        </div>
      );
    }

    if (futureSelf.photo.startsWith('simulated-avatar:')) {
      // Simulated avatar
      const [, emoji, background] = futureSelf.photo.split(':');
      return (
        <div 
          className="w-12 h-12 rounded-full border-2 border-primary/20 flex items-center justify-center text-xl"
          style={{ 
            background: decodeURIComponent(background),
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
        >
          {emoji}
        </div>
      );
    }

    // Real photo
    return (
      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20">
        <img 
          src={futureSelf.photo} 
          alt="Your photo" 
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8" data-testid="profile-loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  // Error state
  if (error && !futureSelf.hasProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-medium mb-2">Failed to load profile</h2>
        <p className="text-muted-foreground mb-4 text-center">{error}</p>
        <Button onClick={reloadProfile} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // Show wizard if user is creating their profile
  if (showWizard) {
    return (
      <FutureSelfWizard 
        onComplete={handleWizardComplete}
        onCancel={handleWizardCancel}
      />
    );
  }

  // Show completed profile
  if (futureSelf.hasProfile) {
    const attributeStats = futureSelf.attributes ? {
      haveNow: Object.values(futureSelf.attributes).filter(v => v === 'have_now').length,
      wantToDevelop: Object.values(futureSelf.attributes).filter(v => v === 'want_to_develop').length,
      notMe: Object.values(futureSelf.attributes).filter(v => v === 'not_me').length,
    } : null;

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border md:p-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {renderProfilePhoto()}
            </div>
            <div>
              <h1>Your Future Self</h1>
              <p className="text-muted-foreground text-sm">
                Created {futureSelf.createdAt ? new Date(futureSelf.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto pb-6 md:pb-8 lg:pb-8">
            
            {/* Row 1: Character Strengths Overview + Current/Future Values */}
            {/* Character Strengths Overview - Large card */}
            {attributeStats && futureSelf.attributes && (
              <Card className="p-4 md:col-span-2 lg:col-span-2 xl:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 border-blue-200 dark:border-blue-800">
                <Collapsible open={isStrengthsExpanded} onOpenChange={setIsStrengthsExpanded}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between w-full">
                      <h3 className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Character Strengths Overview
                      </h3>
                      {isStrengthsExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  
                  <div className="grid grid-cols-3 gap-3 mb-4 mt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{attributeStats.haveNow}</div>
                      <div className="text-xs text-muted-foreground">Have Now</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{attributeStats.wantToDevelop}</div>
                      <div className="text-xs text-muted-foreground">To Develop</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{attributeStats.notMe}</div>
                      <div className="text-xs text-muted-foreground">Not Me</div>
                    </div>
                  </div>
                  
                  <CollapsibleContent className="space-y-4">
                    <div className="text-sm text-muted-foreground border-t border-blue-200 dark:border-blue-800 pt-4">
                      <div className="space-y-4">
                        {/* Strengths I Have Now */}
                        {Object.entries(futureSelf.attributes).filter(([_, value]) => value === 'have_now').length > 0 && (
                          <div>
                            <h4 className="text-green-600 dark:text-green-400 mb-2">Strengths I Have Now</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {Object.entries(futureSelf.attributes)
                                .filter(([_, value]) => value === 'have_now')
                                .map(([strengthKey, _]) => {
                                  const strength = CHARACTER_STRENGTHS[strengthKey];
                                  if (!strength) return null;
                                  return (
                                    <div key={strengthKey} className="bg-green-50 dark:bg-green-950/30 p-2 rounded border border-green-200 dark:border-green-800">
                                      <div className="font-medium text-sm text-green-700 dark:text-green-300">{strength.title}</div>
                                      <div className="text-xs text-green-600 dark:text-green-400">{strength.category}</div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                        
                        {/* Strengths to Develop */}
                        {Object.entries(futureSelf.attributes).filter(([_, value]) => value === 'want_to_develop').length > 0 && (
                          <div>
                            <h4 className="text-blue-600 dark:text-blue-400 mb-2">Strengths to Develop</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {Object.entries(futureSelf.attributes)
                                .filter(([_, value]) => value === 'want_to_develop')
                                .map(([strengthKey, _]) => {
                                  const strength = CHARACTER_STRENGTHS[strengthKey];
                                  if (!strength) return null;
                                  return (
                                    <div key={strengthKey} className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded border border-blue-200 dark:border-blue-800">
                                      <div className="font-medium text-sm text-blue-700 dark:text-blue-300">{strength.title}</div>
                                      <div className="text-xs text-blue-600 dark:text-blue-400">{strength.category}</div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                  
                  <div className="text-sm text-muted-foreground mt-4">
                    Track your character development journey and see which strengths you're building.
                  </div>
                </Collapsible>
              </Card>
            )}

            {/* Current Values - Compact card */}
            {futureSelf.currentValues && futureSelf.currentValues.length > 0 && (
              <Card className="p-4 xl:col-span-1 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 border-green-200 dark:border-green-800">
                <h3 className="mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Current Values
                </h3>
                <div className="flex flex-wrap gap-2">
                  {futureSelf.currentValues.map((value, index) => (
                    <Badge 
                      key={`current-${index}-${value}`} 
                      variant="secondary"
                      className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900/70 text-sm font-medium px-3 py-1"
                    >
                      {value}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Future Values - Compact card */}
            {futureSelf.futureValues && futureSelf.futureValues.length > 0 && (
              <Card className="p-4 xl:col-span-1 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950 dark:to-violet-900 border-purple-200 dark:border-purple-800">
                <h3 className="mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Future Values
                </h3>
                <div className="flex flex-wrap gap-2">
                  {futureSelf.futureValues.map((value, index) => (
                    <Badge 
                      key={`future-${index}-${value}`} 
                      variant="secondary"
                      className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/70 text-sm font-medium px-3 py-1"
                    >
                      {value}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Row 2: Hope + Fear OR Hope spanning full if Fear doesn't exist */}
            {/* Hope - Adjustable width card */}
            {futureSelf.hope && (
              <Card className={`p-4 md:col-span-2 lg:col-span-2 ${futureSelf.fear ? 'xl:col-span-2' : 'xl:col-span-4'} bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900 border-amber-200 dark:border-amber-800`}>
                <h3 className="mb-3 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  Your Hope
                </h3>
                <p className="text-sm leading-relaxed">"{futureSelf.hope}"</p>
              </Card>
            )}

            {/* Fear - Only renders if both hope and fear exist */}
            {futureSelf.fear && futureSelf.hope && (
              <Card className="p-4 lg:col-span-2 xl:col-span-2 bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-950 dark:to-pink-900 border-red-200 dark:border-red-800">
                <h3 className="mb-3 flex items-center gap-2 text-red-600 dark:text-red-400">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Your Fear
                </h3>
                <p className="text-sm leading-relaxed">"{futureSelf.fear}"</p>
              </Card>
            )}

            {/* Fear - Full width if Hope doesn't exist */}
            {futureSelf.fear && !futureSelf.hope && (
              <Card className="p-4 md:col-span-2 lg:col-span-3 xl:col-span-4 bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-950 dark:to-pink-900 border-red-200 dark:border-red-800">
                <h3 className="mb-3 flex items-center gap-2 text-red-600 dark:text-red-400">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Your Fear
                </h3>
                <p className="text-sm leading-relaxed">"{futureSelf.fear}"</p>
              </Card>
            )}

            {/* Row 3: Feelings - Full width */}
            {futureSelf.feelings && (
              <Card className="p-4 md:col-span-2 lg:col-span-3 xl:col-span-4 bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-950 dark:to-cyan-900 border-teal-200 dark:border-teal-800">
                <h3 className="mb-3 flex items-center gap-2 text-teal-600 dark:text-teal-400">
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  How You Feel
                </h3>
                <p className="text-sm leading-relaxed line-clamp-3">"{futureSelf.feelings}"</p>
              </Card>
            )}

            {/* Row 4: Day in Life - Full width */}
            {futureSelf.dayInLife && (
              <Card className="p-4 md:col-span-2 lg:col-span-3 xl:col-span-4 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-950 dark:to-gray-900 border-slate-200 dark:border-slate-800">
                <h3 className="mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                  A Day in Your Future Life
                </h3>
                <div className="text-sm leading-relaxed max-h-32 overflow-y-auto">
                  <p className="whitespace-pre-line">{futureSelf.dayInLife}</p>
                </div>
              </Card>
            )}

          </div>

          {/* Version info at bottom */}
          {profile && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="text-center text-xs text-gray-500 dark:text-gray-400 px-4">
                Version {versionInfo.version} • Last updated {versionInfo.lastUpdated}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border space-y-2 flex-shrink-0">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button 
              onClick={handleShareProfile}
              variant="default"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Profile
            </Button>
            <Button 
              onClick={handleStartWizard}
              variant="outline"
            >
              Update Profile
            </Button>
            <Button 
              onClick={handleResetProfile}
              variant="destructive"
              size="sm"
            >
              Reset Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show initial create button
  return (
    <div className="flex flex-col h-full">
      {/* Show onboarding message if flagged */}
      {showOnboardingMsg && !futureSelf.hasProfile && (
        <div className="p-4 md:p-6">
          <OnboardingMessage 
            onStartProfile={handleStartWizard}
            onDismiss={() => setShowOnboardingMsg(false)}
          />
        </div>
      )}
      
      <div className="flex flex-col items-center justify-center flex-1 p-8">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-6 mx-auto">
            <Sparkles className="w-12 h-12 text-primary-foreground" />
          </div>
          <h1 className="mb-4">Your Future Self</h1>
          <p className="text-muted-foreground max-w-sm">
            Discover who you could become. Create a vision of your future self and get personalized guidance to achieve your goals.
          </p>
        </div>

        <Button 
          onClick={handleStartWizard}
          size="lg"
          className="w-full max-w-sm"
        >
          Create Your Future Self
        </Button>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Build a detailed profile of your aspirations, goals, and the person you want to become.
          </p>
        </div>
      </div>
    </div>
  );
}