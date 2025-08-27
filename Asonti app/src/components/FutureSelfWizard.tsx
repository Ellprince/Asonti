import { useState, useEffect } from 'react';
import { PhotoUploadStep } from './wizard/PhotoUploadStep';
import { AttributesStep } from './wizard/AttributesStep';
import { HopesFearsStep } from './wizard/HopesFearsStep';
import { ValuesStep } from './wizard/ValuesStep';
import { FeelingsStep } from './wizard/FeelingsStep';
import { DayInLifeStep } from './wizard/DayInLifeStep';
import { CompletionStep } from './wizard/CompletionStep';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { X, AlertTriangle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { storage } from './hooks/useLocalStorage';
import { futureSelfService } from '@/services/futureSelfService';
import type { FutureSelfProfile } from '@/lib/supabase';

export interface WizardData {
  photo?: string;
  attributes: Record<string, 'have_now' | 'want_to_develop' | 'not_me'>;
  hope?: string;
  fear?: string;
  currentValues: string[];
  futureValues: string[];
  feelings?: string;
  dayInLife?: string;
  currentStep: number;
  completed: boolean;
}

interface FutureSelfWizardProps {
  onComplete: (data: WizardData) => void;
  onCancel: () => void;
}

const TOTAL_STEPS = 6; // 6 steps (completion is step 7 but not counted in progress)

export function FutureSelfWizard({ onComplete, onCancel }: FutureSelfWizardProps) {
  const [wizardData, setWizardData] = useState<WizardData>({
    attributes: {},
    currentValues: [],
    futureValues: [],
    currentStep: 1,
    completed: false,
  });

  const [storageWarning, setStorageWarning] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load wizard progress from database
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const profile = await futureSelfService.getOrCreateProfile();
        if (profile) {
          setProfileId(profile.id);
          // Map database fields to wizard data
          setWizardData(prev => ({
            ...prev,
            attributes: profile.attributes || {},
            currentValues: Array.isArray(profile.current_values) ? profile.current_values : [],
            futureValues: Array.isArray(profile.future_values) ? profile.future_values : [],
            currentStep: profile.completed_at ? 7 : Math.max(1, Math.min(prev.currentStep, 7)),
            completed: Boolean(profile.completed_at),
            photo: profile.photo_url,
            hope: profile.hope,
            fear: profile.fear,
            feelings: profile.feelings,
            dayInLife: profile.day_in_life,
          }));
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        // Fall back to localStorage if database fails
        const savedWizard = storage.getItem('future-self-wizard');
        if (savedWizard) {
          setWizardData(prev => ({
            ...prev,
            ...savedWizard,
            currentValues: Array.isArray(savedWizard.currentValues) ? savedWizard.currentValues : [],
            futureValues: Array.isArray(savedWizard.futureValues) ? savedWizard.futureValues : [],
          }));
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  // Save wizard data to database whenever it changes
  useEffect(() => {
    if (!profileId || wizardData.currentStep === 0 || isLoading) return;
    
    const saveToDatabase = async () => {
      setIsSaving(true);
      setSaveError(null);
      try {
        await futureSelfService.saveWizardProgress(wizardData.currentStep, {
          photo_url: wizardData.photo,
          attributes: wizardData.attributes,
          hope: wizardData.hope,
          fear: wizardData.fear,
          current_values: wizardData.currentValues,
          future_values: wizardData.futureValues,
          feelings: wizardData.feelings,
          day_in_life: wizardData.dayInLife,
        });
      } catch (error) {
        console.error('Error saving to database:', error);
        setSaveError('Failed to save progress. Your changes are saved locally.');
        // Fallback to localStorage
        const success = storage.setItem('future-self-wizard', wizardData);
        if (!success) {
          setStorageWarning(true);
          setTimeout(() => setStorageWarning(false), 10000);
        }
      } finally {
        setIsSaving(false);
      }
    };
    
    // Debounce saves to avoid too many requests
    const timer = setTimeout(saveToDatabase, 500);
    return () => clearTimeout(timer);
  }, [wizardData, profileId, isLoading]);

  const updateWizardData = (updates: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = async () => {
    if (wizardData.currentStep < 6) {
      updateWizardData({ currentStep: wizardData.currentStep + 1 });
    } else if (wizardData.currentStep === 6) {
      // Move to completion step
      updateWizardData({ currentStep: 7 });
    } else {
      // Handle final completion
      if (profileId) {
        try {
          await futureSelfService.completeWizard(profileId);
        } catch (error) {
          console.error('Error completing wizard:', error);
        }
      }
      const completedData = { ...wizardData, completed: true };
      updateWizardData({ completed: true });
      onComplete(completedData);
    }
  };

  const prevStep = () => {
    if (wizardData.currentStep > 1) {
      updateWizardData({ currentStep: wizardData.currentStep - 1 });
    }
  };

  const handleCancel = () => {
    // Keep data in database, just exit the wizard
    onCancel();
  };

  const handleCompletion = async () => {
    if (profileId) {
      try {
        await futureSelfService.completeWizard(profileId);
      } catch (error) {
        console.error('Error completing wizard:', error);
      }
    }
    const completedData = { ...wizardData, completed: true };
    updateWizardData({ completed: true });
    onComplete(completedData);
  };

  const clearStorageAndContinue = () => {
    // Clear low priority items and compress current data
    const storageInfo = storage.getStorageInfo();
    console.log('Storage info:', storageInfo);
    
    const clearedSpace = storage.clearLowPriorityItems();
    if (clearedSpace > 0) {
      setStorageWarning(false);
      setStorageError(false);
      // Try to save again
      storage.setItem('future-self-wizard', wizardData);
    }
  };

  const getStepTitle = () => {
    return 'Create your future self';
  };

  // Check if current step is valid for navigation
  const canProceedToNext = () => {
    const step = wizardData.currentStep;
    if (step === 1) return Boolean(wizardData.photo);
    if (step === 2) {
      // Check if all attributes are answered - use dynamic count instead of hardcoded
      const answeredCount = Object.keys(wizardData.attributes).length;
      const validAnsweredCount = Object.values(wizardData.attributes).filter(v => 
        v === 'have_now' || v === 'want_to_develop' || v === 'not_me'
      ).length;
      // Ensure we have exactly 24 valid responses (matching ATTRIBUTES array length)
      return answeredCount === 24 && validAnsweredCount === 24;
    }
    if (step === 3) return Boolean(wizardData.hope && wizardData.fear);
    if (step === 4) return wizardData.currentValues.length > 0 && wizardData.futureValues.length > 0;
    if (step === 5) return Boolean(wizardData.feelings);
    if (step === 6) return Boolean(wizardData.dayInLife);
    return true;
  };

  const renderCurrentStep = () => {
    const step = wizardData.currentStep;
    
    try {
      if (step === 1) {
        return (
          <PhotoUploadStep
            currentPhoto={wizardData.photo}
            onPhotoChange={(photo) => updateWizardData({ photo })}
          />
        );
      }
      
      if (step === 2) {
        return (
          <AttributesStep
            attributes={wizardData.attributes}
            onAttributesChange={(attributes) => updateWizardData({ attributes })}
            onStepComplete={nextStep}
          />
        );
      }
      
      if (step === 3) {
        return (
          <HopesFearsStep
            hope={wizardData.hope}
            fear={wizardData.fear}
            onDataChange={(data) => updateWizardData(data)}
          />
        );
      }
      
      if (step === 4) {
        return (
          <ValuesStep
            currentValues={wizardData.currentValues}
            futureValues={wizardData.futureValues}
            onDataChange={(data) => updateWizardData(data)}
          />
        );
      }
      
      if (step === 5) {
        return (
          <FeelingsStep
            feelings={wizardData.feelings}
            onDataChange={(feelings) => updateWizardData({ feelings })}
          />
        );
      }
      
      if (step === 6) {
        return (
          <DayInLifeStep
            dayInLife={wizardData.dayInLife}
            onDataChange={(dayInLife) => updateWizardData({ dayInLife })}
          />
        );
      }
      
      if (step === 7) {
        return (
          <CompletionStep
            wizardData={wizardData}
            onComplete={handleCompletion}
          />
        );
      }
    } catch (error) {
      console.error('Error rendering step:', error);
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <h2 className="text-xl font-medium leading-relaxed mb-4">Oops! Something went wrong</h2>
          <p className="text-muted-foreground mb-6 font-normal leading-relaxed">There was an error loading this step.</p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={handleCancel} className="font-medium leading-relaxed">
              Cancel
            </Button>
            <Button onClick={() => updateWizardData({ currentStep: 1 })} className="font-medium leading-relaxed">
              Restart
            </Button>
          </div>
        </div>
      );
    }
    
    // Fallback for invalid steps
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-xl font-medium leading-relaxed mb-4">Step {step}</h2>
        <p className="text-muted-foreground mb-6 font-normal leading-relaxed">This step is not available.</p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleCancel} className="font-medium leading-relaxed">
            Cancel
          </Button>
          <Button onClick={() => updateWizardData({ currentStep: 1 })} className="font-medium leading-relaxed">
            Go to Start
          </Button>
        </div>
      </div>
    );
  };

  // Show loading state while fetching profile
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Save status indicator */}
      {isSaving && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-background/95 px-3 py-1.5 rounded-md border shadow-sm z-10">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">Saving...</span>
        </div>
      )}
      
      {/* Save error */}
      {saveError && (
        <div className="p-2 bg-red-50 dark:bg-red-950 border-b border-red-200 dark:border-red-900">
          <p className="text-xs text-red-600 dark:text-red-400 text-center">{saveError}</p>
        </div>
      )}

      {/* Storage Warnings */}
      {(storageWarning || storageError) && (
        <div className="p-3 bg-orange-100 dark:bg-orange-900 border-b border-orange-200 dark:border-orange-800">
          <div className="flex items-start gap-2 max-w-md mx-auto">
            <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm flex-1">
              <div className="font-medium text-orange-800 dark:text-orange-200 leading-relaxed">Storage Full</div>
              <div className="text-orange-700 dark:text-orange-300 mb-2 font-normal leading-relaxed">
                {storageError ? 
                  'Unable to save your progress. Your data is safe but may not persist.' :
                  'Storage is full. We\'ve optimized your data automatically.'
                }
              </div>
              {storageError && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={clearStorageAndContinue}
                  className="text-xs font-medium leading-relaxed"
                >
                  Clear Space & Continue
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      {wizardData.currentStep < 7 && (
        <div className="p-4 bg-background border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-medium leading-relaxed">{getStepTitle()}</h1>
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground font-normal leading-relaxed">
              <span>Step {wizardData.currentStep} of {TOTAL_STEPS}</span>
              <span>{Math.round((wizardData.currentStep / TOTAL_STEPS) * 100)}%</span>
            </div>
            <Progress value={(wizardData.currentStep / TOTAL_STEPS) * 100} />
          </div>
        </div>
      )}

      {/* Step Content - Now with bottom padding for navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {renderCurrentStep()}
      </div>

      {/* Wizard Navigation - Now inline instead of fixed */}
      {wizardData.currentStep < 7 && (
        <div className="bg-background border-t border-border p-4">
          <div className="flex justify-between items-center max-w-md mx-auto">
            <div>
              {wizardData.currentStep > 1 && (
                <Button variant="outline" onClick={prevStep} disabled={isSaving}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
            </div>
            
            <div>
              {wizardData.currentStep < 6 && (
                <Button 
                  onClick={nextStep} 
                  disabled={!canProceedToNext() || isSaving}
                  className="min-w-24"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
              {wizardData.currentStep === 6 && (
                <Button 
                  onClick={nextStep} 
                  disabled={!canProceedToNext() || isSaving}
                  className="min-w-24"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Complete
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}