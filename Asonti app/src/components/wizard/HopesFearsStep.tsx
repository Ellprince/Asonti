import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { ArrowLeft } from 'lucide-react';

interface HopesFearsStepProps {
  hope?: string;
  fear?: string;
  onDataChange: (data: { hope?: string; fear?: string }) => void;
}

export function HopesFearsStep({ hope = '', fear = '', onDataChange }: HopesFearsStepProps) {
  const [localHope, setLocalHope] = useState(hope || '');
  const [localFear, setLocalFear] = useState(fear || '');

  // Sync with props when they change
  useEffect(() => {
    setLocalHope(hope || '');
    setLocalFear(fear || '');
  }, [hope, fear]);

  const handleHopeChange = (value: string) => {
    setLocalHope(value);
    onDataChange({ hope: value, fear: localFear });
  };

  const handleFearChange = (value: string) => {
    setLocalFear(value);
    onDataChange({ hope: localHope, fear: value });
  };

  // More reasonable validation - require at least some meaningful content
  const hopeValid = localHope && localHope.trim().length >= 5;
  const fearValid = localFear && localFear.trim().length >= 5;

  const hopeExample = "As a senior marketing director, I hope to lead innovative campaigns that drive sustainable change, working with diverse teams in a collaborative environment where creativity and impact go hand in hand.";
  
  const fearExample = "I fear staying in a junior role where I'm constantly stressed about deadlines, working in isolation without growth opportunities, feeling stuck in repetitive tasks that don't utilize my potential.";

  return (
    <div className="flex flex-col h-full p-6">
      <div className="text-center mb-6">
        <h2 className="mb-2">Your Future Vision</h2>
        <p className="text-muted-foreground text-sm">
          Share your hopes and fears about your future. Think about your role, activities, and context.
        </p>
      </div>

      <div className="flex-1 space-y-6 overflow-auto">
        {/* Hope Section */}
        <div className="space-y-3">
          <Label htmlFor="hope">A hope for your future</Label>
          <Textarea
            id="hope"
            value={localHope}
            onChange={(e) => handleHopeChange(e.target.value)}
            placeholder="Describe a positive vision of your future..."
            className="min-h-24 resize-none"
          />
          <div className="text-xs flex justify-between items-center">
            <span className="text-muted-foreground">
              {localHope ? localHope.trim().length : 0}/5 characters minimum
            </span>
            {hopeValid && <span className="text-green-600 font-medium">✓ Ready</span>}
          </div>
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <div className="mb-1">Example:</div>
            <div className="italic">{hopeExample}</div>
          </div>
        </div>

        {/* Fear Section */}
        <div className="space-y-3">
          <Label htmlFor="fear">A fear for your future</Label>
          <Textarea
            id="fear"
            value={localFear}
            onChange={(e) => handleFearChange(e.target.value)}
            placeholder="Describe what you want to avoid in your future..."
            className="min-h-24 resize-none"
          />
          <div className="text-xs flex justify-between items-center">
            <span className="text-muted-foreground">
              {localFear ? localFear.trim().length : 0}/5 characters minimum
            </span>
            {fearValid && <span className="text-green-600 font-medium">✓ Ready</span>}
          </div>
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <div className="mb-1">Example:</div>
            <div className="italic">{fearExample}</div>
          </div>
        </div>
      </div>
    </div>
  );
}