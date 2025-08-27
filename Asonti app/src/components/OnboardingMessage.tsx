import { Sparkles } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Button } from './ui/button';

interface OnboardingMessageProps {
  onStartProfile: () => void;
  onDismiss?: () => void;
}

export function OnboardingMessage({ onStartProfile, onDismiss }: OnboardingMessageProps) {
  return (
    <Alert className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
      <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-900 dark:text-blue-100">Welcome to ASONTI AI!</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-blue-800 dark:text-blue-200">
          To start your journey with your future self, you'll need to create your personalized profile first.
          This helps our AI understand who you are and who you aspire to become.
        </p>
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={onStartProfile}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            Create Your Future Self
          </Button>
          {onDismiss && (
            <Button 
              variant="ghost" 
              onClick={onDismiss}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Later
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}