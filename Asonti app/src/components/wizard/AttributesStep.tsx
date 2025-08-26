import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';

interface AttributesStepProps {
  attributes: Record<string, 'have_now' | 'want_to_develop' | 'not_me'>;
  onAttributesChange: (attributes: Record<string, 'have_now' | 'want_to_develop' | 'not_me'>) => void;
  onStepComplete?: () => void; // Add callback for when all attributes are completed
}

interface Attribute {
  name: string;
  title: string;
  description: string;
  category: string;
}

const ATTRIBUTES: Attribute[] = [
  // Wisdom & Knowledge
  { name: 'creativity', title: 'Creativity', description: 'Thinking of novel and productive ways to conceptualize and do things', category: 'Wisdom & Knowledge' },
  { name: 'curiosity', title: 'Curiosity', description: 'Taking an interest in ongoing experience for its own sake; exploring and discovering', category: 'Wisdom & Knowledge' },
  { name: 'judgment', title: 'Judgment', description: 'Thinking things through and examining them from all sides; weighing all evidence fairly', category: 'Wisdom & Knowledge' },
  { name: 'love_of_learning', title: 'Love of Learning', description: 'Mastering new skills, topics, and bodies of knowledge, whether on one\'s own or formally', category: 'Wisdom & Knowledge' },
  { name: 'perspective', title: 'Perspective', description: 'Being able to provide wise counsel to others; having ways of looking at the world that make sense', category: 'Wisdom & Knowledge' },
  
  // Courage
  { name: 'bravery', title: 'Bravery', description: 'Not shrinking from threat, challenge, difficulty, or pain; acting on convictions even if unpopular', category: 'Courage' },
  { name: 'perseverance', title: 'Perseverance', description: 'Persisting in a course of action in spite of being fatigued or discouraged', category: 'Courage' },
  { name: 'honesty', title: 'Honesty', description: 'Speaking the truth but more broadly presenting oneself in a genuine way and acting in a sincere way', category: 'Courage' },
  { name: 'zest', title: 'Zest', description: 'Approaching life with excitement and energy; living life as an adventure; feeling alive and activated', category: 'Courage' },
  
  // Humanity
  { name: 'love', title: 'Love', description: 'Capacity for close relationships with others; valuing close relationships with others', category: 'Humanity' },
  { name: 'kindness', title: 'Kindness', description: 'Doing favors and good deeds for others; helping them; taking care of them', category: 'Humanity' },
  { name: 'social_intelligence', title: 'Social Intelligence', description: 'Understanding the motives and feelings of other people and oneself; acting appropriately in social situations', category: 'Humanity' },
  
  // Justice
  { name: 'teamwork', title: 'Teamwork', description: 'Excelling as a member of a group or team; being a good citizen; doing one\'s share', category: 'Justice' },
  { name: 'fairness', title: 'Fairness', description: 'Treating all people the same according to notions of fairness and justice; giving everyone a fair chance', category: 'Justice' },
  { name: 'leadership', title: 'Leadership', description: 'Encouraging a group to get things done while maintaining good relations within the group', category: 'Justice' },
  
  // Temperance
  { name: 'forgiveness', title: 'Forgiveness', description: 'Forgiving those who have done wrong; accepting others\' shortcomings; giving people a second chance', category: 'Temperance' },
  { name: 'humility', title: 'Humility', description: 'Letting one\'s accomplishments speak for themselves; not regarding oneself as more special than others', category: 'Temperance' },
  { name: 'prudence', title: 'Prudence', description: 'Being careful about one\'s choices; not taking undue risks; not saying or doing things that might later be regretted', category: 'Temperance' },
  { name: 'self_regulation', title: 'Self-Regulation', description: 'Regulating what one feels and does; being self-disciplined; controlling appetites and emotions', category: 'Temperance' },
  
  // Transcendence
  { name: 'appreciation_of_beauty', title: 'Appreciation of Beauty & Excellence', description: 'Noticing and appreciating beauty, excellence, and skilled performance in various domains of life', category: 'Transcendence' },
  { name: 'gratitude', title: 'Gratitude', description: 'Being aware of and thankful for good things; taking time to express thanks', category: 'Transcendence' },
  { name: 'hope', title: 'Hope', description: 'Expecting the best in the future and working to achieve it; believing that a good future is something that can be brought about', category: 'Transcendence' },
  { name: 'humor', title: 'Humor', description: 'Liking to laugh and tease; bringing smiles to other people; seeing the light side', category: 'Transcendence' },
  { name: 'spirituality', title: 'Spirituality', description: 'Having coherent beliefs about higher purpose and meaning; having beliefs that shape actions and provide comfort', category: 'Transcendence' },
];

export function AttributesStep({ attributes, onAttributesChange, onStepComplete }: AttributesStepProps) {
  const [currentAttributeIndex, setCurrentAttributeIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Ensure currentAttributeIndex is within bounds
  const safeCurrentIndex = Math.max(0, Math.min(currentAttributeIndex, ATTRIBUTES.length - 1));
  const currentAttribute = ATTRIBUTES[safeCurrentIndex];
  
  const progress = ((safeCurrentIndex + 1) / ATTRIBUTES.length) * 100;
  const isLastAttribute = safeCurrentIndex === ATTRIBUTES.length - 1;

  // Check if all attributes are answered
  const allAttributesAnswered = ATTRIBUTES.every(attr => 
    attributes[attr.name] && 
    (attributes[attr.name] === 'have_now' || 
     attributes[attr.name] === 'want_to_develop' || 
     attributes[attr.name] === 'not_me')
  );

  // Auto-advance to first unanswered attribute
  useEffect(() => {
    const firstUnanswered = ATTRIBUTES.findIndex(attr => !attributes[attr.name]);
    if (firstUnanswered !== -1 && firstUnanswered !== safeCurrentIndex) {
      // Don't auto-advance if we're currently on the last attribute and it's being answered
      // This prevents the race condition on the final attribute
      if (safeCurrentIndex === ATTRIBUTES.length - 1 && attributes[currentAttribute.name]) {
        return;
      }
      setCurrentAttributeIndex(firstUnanswered);
    }
  }, [attributes, safeCurrentIndex, currentAttribute.name]);

  // Safety check to ensure we have a valid current attribute
  if (!currentAttribute) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="mb-4">Loading Attributes...</h2>
      </div>
    );
  }

  const handleAttributeResponse = (response: 'have_now' | 'want_to_develop' | 'not_me') => {
    const newAttributes = {
      ...attributes,
      [currentAttribute.name]: response
    };
    onAttributesChange(newAttributes);

    // Check if all attributes are now answered
    const allAnswered = ATTRIBUTES.every(attr => 
      newAttributes[attr.name] && 
      (newAttributes[attr.name] === 'have_now' || 
       newAttributes[attr.name] === 'want_to_develop' || 
       newAttributes[attr.name] === 'not_me')
    );

    // If this is the last attribute and we've answered it, trigger step completion after a delay
    if (allAnswered && onStepComplete) {
      setIsCompleted(true);
      setTimeout(() => {
        onStepComplete();
      }, 1500); // Give user time to see the completion
    } else if (!isLastAttribute) {
      // Auto-advance to next attribute if not the last one
      setTimeout(() => {
        setCurrentAttributeIndex(prev => Math.min(prev + 1, ATTRIBUTES.length - 1));
      }, 300);
    }
  };

  const currentResponse = attributes[currentAttribute.name];

  return (
    <div className="flex flex-col h-full p-6">
      {/* Step Header */}
      <div className="text-center mb-6">
        <h2 className="mb-2">Character Strengths</h2>
        <p className="text-muted-foreground text-sm">
          Let's explore your character strengths. For each attribute, tell us how it relates to you.
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>{allAttributesAnswered && isCompleted ? 'Complete!' : currentAttribute.category}</span>
          <span>{safeCurrentIndex + 1} of {ATTRIBUTES.length}</span>
        </div>
        <Progress value={allAttributesAnswered ? 100 : progress} />
      </div>

      {/* Completion State */}
      {allAttributesAnswered && isCompleted ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-sm bg-card border rounded-lg p-6 text-center mb-8">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="mb-4">Character Strengths Complete!</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Great work! You've identified your character strengths across all categories.
            </p>
          </div>
        </div>
      ) : (
        /* Current Attribute Card */
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-sm bg-card border rounded-lg p-6 text-center mb-8">
            <h3 className="mb-4">{currentAttribute.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {currentAttribute.description}
            </p>
          </div>

          {/* Response Buttons */}
          <div className="space-y-3 w-full max-w-sm">
            <Button
              variant={currentResponse === 'have_now' ? 'default' : 'outline'}
              size="lg"
              className="w-full"
              onClick={() => handleAttributeResponse('have_now')}
            >
              I have this now
            </Button>
            <Button
              variant={currentResponse === 'want_to_develop' ? 'default' : 'outline'}
              size="lg"
              className="w-full"
              onClick={() => handleAttributeResponse('want_to_develop')}
            >
              I want to develop this
            </Button>
            <Button
              variant={currentResponse === 'not_me' ? 'default' : 'outline'}
              size="lg"
              className="w-full"
              onClick={() => handleAttributeResponse('not_me')}
            >
              This isn't me
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}