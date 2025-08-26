import { useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { ArrowLeft, Clock, Coffee, Briefcase, Moon } from 'lucide-react';

interface DayInLifeStepProps {
  dayInLife?: string;
  onDataChange: (dayInLife: string) => void;
}

export function DayInLifeStep({ dayInLife = '', onDataChange }: DayInLifeStepProps) {
  const [localDayInLife, setLocalDayInLife] = useState(dayInLife);

  const handleDayInLifeChange = (value: string) => {
    setLocalDayInLife(value);
    onDataChange(value);
  };

  const timePrompts = [
    { id: 'morning', icon: Coffee, time: "Morning", prompt: "How does your future self start the day?" },
    { id: 'work', icon: Briefcase, time: "Work/Day", prompt: "What does a typical work day look like?" },
    { id: 'evening', icon: Clock, time: "Evening", prompt: "How do you spend your evenings?" },
    { id: 'night', icon: Moon, time: "Night", prompt: "How does your future self wind down?" }
  ];

  const insertTimePrompt = (prompt: string) => {
    const newText = localDayInLife ? `${localDayInLife}\n\n${prompt}` : prompt;
    handleDayInLifeChange(newText);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-medium leading-relaxed mb-2">A Day in Your Future Life</h2>
            <p className="text-muted-foreground text-sm font-normal leading-relaxed">
              Describe a typical day as your future self. What does your routine look like? How do you spend your time?
            </p>
          </div>

          {/* Time-based Prompts */}
          <div className="mb-6">
            <Label className="text-sm font-medium leading-relaxed">Break it down by time of day:</Label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {timePrompts.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => insertTimePrompt(`${item.time}: ${item.prompt}`)}
                    className="text-left text-xs hover:text-foreground transition-colors border border-border rounded-lg p-3 hover:bg-accent font-normal leading-relaxed"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3 h-3" />
                      <span className="font-medium text-sm leading-relaxed">{item.time}</span>
                    </div>
                    <div className="text-muted-foreground text-xs font-normal leading-relaxed">{item.prompt}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Area Section */}
          <div className="mb-6">
            <Label htmlFor="dayInLife" className="mb-3 block text-base font-medium leading-relaxed">
              Describe your day
            </Label>
            <Textarea
              id="dayInLife"
              value={localDayInLife}
              onChange={(e) => handleDayInLifeChange(e.target.value)}
              placeholder="In my future life, a typical day starts with..."
              className="min-h-48 resize-none text-base font-normal leading-relaxed"
              rows={12}
            />
            <div className="text-xs text-muted-foreground mt-2 font-normal leading-relaxed">
              {localDayInLife.length} characters (minimum 50 required)
            </div>
          </div>

          {/* Example */}
          <div className="text-xs text-muted-foreground bg-muted p-4 rounded-lg mb-6 font-normal leading-relaxed">
            <div className="mb-2 font-medium text-sm leading-relaxed">Example:</div>
            <div className="italic text-xs font-normal leading-relaxed">
              "I wake up at 6 AM feeling energized and grateful. After meditation and exercise, I review my goals over coffee. 
              At work, I lead a team meeting where we brainstorm creative solutions. Evenings are spent with family, 
              learning something new, and reflecting on the day's progress toward my larger vision..."
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}