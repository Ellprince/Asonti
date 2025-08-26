import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { ArrowLeft } from 'lucide-react';

interface ValuesStepProps {
  currentValues?: string[];
  futureValues?: string[];
  onDataChange: (data: { currentValues: string[]; futureValues: string[] }) => void;
}

const VALUES_CATEGORIES = {
  'Self and growth': [
    'Integrity',
    'Honesty', 
    'Courage',
    'Curiosity',
    'Learning',
    'Discipline',
    'Resilience',
    'Freedom',
    'Autonomy',
    'Balance'
  ],
  'Relationships': [
    'Love',
    'Kindness',
    'Compassion',
    'Respect',
    'Trust',
    'Gratitude',
    'Belonging',
    'Loyalty'
  ],
  'Work and craft': [
    'Excellence',
    'Mastery',
    'Diligence',
    'Accountability',
    'Reliability',
    'Initiative',
    'Creativity',
    'Impact'
  ],
  'Purpose and meaning': [
    'Purpose',
    'Contribution',
    'Service',
    'Justice',
    'Equality',
    'Sustainability',
    'Legacy'
  ],
  'Wellbeing': [
    'Health',
    'Vitality',
    'Mindfulness',
    'Simplicity',
    'Stability',
    'Peace'
  ],
  'Leadership and community': [
    'Fairness',
    'Responsibility',
    'Collaboration',
    'Inclusion',
    'Empathy',
    'Stewardship'
  ]
};

export function ValuesStep({ 
  currentValues = [], 
  futureValues = [], 
  onDataChange
}: ValuesStepProps) {
  // Ensure we have valid arrays
  const safeCurrentValues = Array.isArray(currentValues) ? currentValues : [];
  const safeFutureValues = Array.isArray(futureValues) ? futureValues : [];
  
  const [selectionMode, setSelectionMode] = useState<'current' | 'future'>('current');
  const [localCurrentValues, setLocalCurrentValues] = useState<string[]>(safeCurrentValues);
  const [localFutureValues, setLocalFutureValues] = useState<string[]>(safeFutureValues);

  // Sync with props if they change
  useEffect(() => {
    setLocalCurrentValues(safeCurrentValues);
    setLocalFutureValues(safeFutureValues);
  }, [currentValues, futureValues]);

  const activeValues = selectionMode === 'current' ? localCurrentValues : localFutureValues;
  const setActiveValues = selectionMode === 'current' ? setLocalCurrentValues : setLocalFutureValues;

  const toggleValue = (value: string) => {
    if (!value || typeof value !== 'string') return;
    
    const newValues = activeValues.includes(value)
      ? activeValues.filter(v => v !== value)
      : activeValues.length < 3 
        ? [...activeValues, value]
        : activeValues; // Don't add if already at limit

    setActiveValues(newValues);

    // Update parent data
    const updatedData = selectionMode === 'current' 
      ? { currentValues: newValues, futureValues: localFutureValues }
      : { currentValues: localCurrentValues, futureValues: newValues };
    
    onDataChange(updatedData);
  };

  const canSwitchToFuture = localCurrentValues.length === 3;

  const handleModeSwitch = (mode: 'current' | 'future') => {
    if (mode === 'future' && !canSwitchToFuture) return;
    setSelectionMode(mode);
  };

  return (
    <div className="flex flex-col h-full p-6">
      <div className="text-center mb-6">
        <h2 className="mb-2">Your Core Values</h2>
        <p className="text-muted-foreground text-sm">
          Choose 3 values you have now, then 3 values you want to develop in the future.
        </p>
      </div>

      {/* Progress Indicators */}
      <div className="space-y-4 mb-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Values I Have Now</span>
            <span className="text-sm text-muted-foreground">{localCurrentValues.length}/3</span>
          </div>
          <Progress value={(localCurrentValues.length / 3) * 100} className="h-2" />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Values I Want</span>
            <span className="text-sm text-muted-foreground">{localFutureValues.length}/3</span>
          </div>
          <Progress value={(localFutureValues.length / 3) * 100} className="h-2" />
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-4 p-3 bg-accent rounded-lg">
        <p className="text-sm">
          {selectionMode === 'current' 
            ? 'Select 3 values that best represent who you are today.'
            : 'Select 3 values you want to develop or strengthen in your future self.'
          }
        </p>
        {activeValues.length === 3 && (
          <p className="text-xs text-muted-foreground mt-1">
            You've selected 3 values. Click on a selected value to remove it.
          </p>
        )}
      </div>

      {/* Values Grid */}
      <div className="flex-1 overflow-auto space-y-6">
        {Object.entries(VALUES_CATEGORIES).map(([category, values]) => (
          <div key={category}>
            <h3 className="mb-3 text-sm">{category}</h3>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const isSelected = activeValues.includes(value);
                const isOtherModeSelected = selectionMode === 'current' 
                  ? localFutureValues.includes(value)
                  : localCurrentValues.includes(value);
                
                return (
                  <Badge
                    key={value}
                    variant={isSelected ? 'default' : 'outline'}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground' 
                        : activeValues.length >= 3 
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-accent'
                    } ${isOtherModeSelected ? 'ring-2 ring-secondary' : ''}`}
                    onClick={() => toggleValue(value)}
                  >
                    {value}
                    {isOtherModeSelected && <span className="ml-1 text-xs">✓</span>}
                  </Badge>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Mode Selection */}
      <div className="flex gap-2 mt-6">
        <Button
          variant={selectionMode === 'current' ? 'default' : 'outline'}
          onClick={() => handleModeSwitch('current')}
          className="flex-1"
        >
          Values I Have Now ({localCurrentValues.length}/3)
        </Button>
        <Button
          variant={selectionMode === 'future' ? 'default' : 'outline'}
          onClick={() => handleModeSwitch('future')}
          disabled={!canSwitchToFuture}
          className="flex-1"
        >
          Values I Want ({localFutureValues.length}/3)
        </Button>
      </div>
    </div>
  );
}