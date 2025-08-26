import { useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { ArrowLeft, Heart, Smile, Zap } from 'lucide-react';

interface FeelingsStepProps {
  feelings?: string;
  onDataChange: (feelings: string) => void;
}

export function FeelingsStep({ feelings = '', onDataChange }: FeelingsStepProps) {
  const [localFeelings, setLocalFeelings] = useState(feelings);

  const handleFeelingsChange = (value: string) => {
    setLocalFeelings(value);
    onDataChange(value);
  };

  const promptQuestions = [
    "How do you feel when you imagine becoming this future version of yourself?",
    "What emotions arise when you think about achieving your goals?",
    "How would your daily mood and energy change?",
    "What would confidence feel like in this future state?"
  ];

  const insertPrompt = (prompt: string) => {
    const newText = localFeelings ? `${localFeelings}\n\n${prompt}` : prompt;
    handleFeelingsChange(newText);
  };

  return (
    <div className="flex flex-col h-full p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="mb-2">Imagining Your Future Self</h2>
        <p className="text-muted-foreground text-sm">
          How do you feel when you imagine yourself as this future person? Describe the emotions and sensations.
        </p>
      </div>

      {/* Feeling Prompts */}
      <div className="mb-4">
        <Label className="text-sm">Need inspiration? Try answering these:</Label>
        <div className="mt-2 space-y-2">
          {promptQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => insertPrompt(question)}
              className="text-left text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg p-2 w-full hover:bg-accent"
            >
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                  {index === 0 && <Smile className="w-2 h-2" />}
                  {index === 1 && <Zap className="w-2 h-2" />}
                  {index === 2 && <Heart className="w-2 h-2" />}
                  {index === 3 && <Smile className="w-2 h-2" />}
                </div>
                <span>{question}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Text Area */}
      <div className="flex-1 flex flex-col">
        <Label htmlFor="feelings" className="mb-2">How you feel about your future self</Label>
        <Textarea
          id="feelings"
          value={localFeelings}
          onChange={(e) => handleFeelingsChange(e.target.value)}
          placeholder="When I imagine my future self, I feel..."
          className="flex-1 min-h-32 resize-none"
        />
        <div className="text-xs text-muted-foreground mt-2">
          {localFeelings.length} characters (minimum 20 required)
        </div>
      </div>
    </div>
  );
}