import { useState, useEffect, useRef } from 'react';
import { Send, Mic, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { storage } from './hooks/useLocalStorage';
import { aiChatClient } from '@/services/aiChatClient';
import { TypingIndicator } from './TypingIndicator';
import { StreamingText } from './StreamingText';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isStreaming?: boolean;
}

interface FutureSelfData {
  hasProfile: boolean;
  photo?: string;
}

interface ChatScreenProps {
  scrollToBottom?: () => void;
  activeTab?: string;
}

export function ChatScreen({ scrollToBottom, activeTab }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [futureSelf, setFutureSelf] = useState<FutureSelfData>({ hasProfile: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const desktopScrollRef = useRef<HTMLDivElement>(null);

  // Load profile data for avatar
  useEffect(() => {
    const savedData = storage.getItem('future-self-data');
    if (savedData) {
      setFutureSelf({
        hasProfile: Boolean(savedData.hasProfile),
        photo: savedData.photo,
      });
    }
  }, []);

  // Load messages from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chat-messages');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(parsedMessages);
        // Sync with chat service for context
        aiChatClient.setHistory(parsedMessages);
      } catch (error) {
        console.error('Error loading messages from localStorage:', error);
        // Set default welcome message if loading fails
        setDefaultMessage();
      }
    } else {
      // Set default welcome message if no saved messages
      setDefaultMessage();
    }
  }, []);

  const setDefaultMessage = () => {
    const welcomeMessage: Message = {
      id: '1',
      text: 'Hello! I\'m here to help answer your questions. What would you like to know?',
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  // Render future self avatar
  const renderFutureSelfAvatar = () => {
    if (!futureSelf.photo) {
      // Default future self avatar with aging effects using Tailwind classes
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-xl text-white border-2 border-white/30 shadow-lg relative">
          🌟
          {/* Subtle aging effect overlay */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
              border: '1px solid rgba(255, 215, 0, 0.3)'
            }}
          />
        </div>
      );
    }

    if (futureSelf.photo.startsWith('simulated-avatar:')) {
      // Enhanced simulated avatar with future/aging effects
      const [, emoji, background] = futureSelf.photo.split(':');
      return (
        <div className="relative">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl border-2"
            style={{ 
              background: decodeURIComponent(background),
              borderColor: 'rgba(255, 215, 0, 0.4)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
          >
            {emoji}
          </div>
          {/* Future glow effect */}
          <div 
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'linear-gradient(45deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
              border: '1px solid rgba(255, 215, 0, 0.2)'
            }}
          />
        </div>
      );
    }

    // Real photo with future/aging effects
    return (
      <div className="relative">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20">
          <img 
            src={futureSelf.photo} 
            alt="Future self" 
            className="w-full h-full object-cover"
            style={{
              filter: 'sepia(10%) contrast(110%) brightness(105%)',
            }}
          />
        </div>
        {/* Future overlay effect */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(45deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            boxShadow: '0 2px 8px rgba(255, 215, 0, 0.2)'
          }}
        />
      </div>
    );
  };

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chat-messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const timer = setTimeout(() => {
      // For mobile/tablet (using parent scroll container) - skip if desktop
      if (scrollToBottom && window.innerWidth < 1024) {
        scrollToBottom();
      }
      
      // For desktop (using internal scroll container) 
      if (desktopScrollRef.current && window.innerWidth >= 1024) {
        desktopScrollRef.current.scrollTo({
          top: desktopScrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100); // Small delay to ensure DOM is updated

    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setIsTyping(true);
    setError(null);

    try {
      // Send message to AI service
      const { response, error: apiError } = await aiChatClient.sendMessage(userMessage.text);
      
      if (apiError) {
        console.warn('AI service notice:', apiError);
      }
      
      // Stop typing indicator and add streaming response with a small delay
      const aiResponseId = (Date.now() + 1).toString();
      
      setTimeout(() => {
        setIsTyping(false);
        
        const aiResponse: Message = {
          id: aiResponseId,
          text: response,
          isUser: false,
          timestamp: new Date(),
          isStreaming: true,
        };
        
        setMessages(prev => [...prev, aiResponse]);
        
        // After streaming completes, mark as not streaming
        setTimeout(() => {
          setMessages(prev => prev.map(msg => 
            msg.id === aiResponseId ? { ...msg, isStreaming: false } : msg
          ));
        }, (response.length / 60) * 1000); // Based on streaming speed
      }, 300); // Small delay for realism
      
    } catch (error: any) {
      console.error('Chat error:', error);
      setError(error.message || 'Failed to send message. Please try again.');
      setIsTyping(false);
      
      // Add error message as system response
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I\'m having trouble connecting right now. Please check your connection and try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleMicrophoneClick = () => {
    // Placeholder for future voice functionality
    console.log('Microphone clicked - voice functionality will be added later');
  };

  // Render input area
  const renderInputArea = () => (
    <div className="flex gap-2 max-w-3xl mx-auto">
      <Button 
        onClick={handleMicrophoneClick} 
        size="icon"
        variant="outline"
        className="text-muted-foreground hover:text-foreground"
      >
        <Mic className="w-4 h-4" />
      </Button>
      <Input
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={isLoading ? "Waiting for response..." : "Type your message..."}
        className="flex-1"
        disabled={isLoading}
      />
      <Button onClick={handleSendMessage} size="icon" disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </div>
  );

  return (
    <>
      {/* Mobile and Tablet Layout (up to lg) */}
      <div className="flex flex-col h-full lg:hidden">
        <div className="p-4 border-b border-border md:p-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {renderFutureSelfAvatar()}
            </div>
            <div>
              <h1>Your Future Self</h1>
              <p className="text-muted-foreground text-sm">Ask yourself anything!</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-6 pb-24 md:pb-28 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] md:max-w-[70%] p-3 md:p-4 rounded-lg ${
                    message.isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {message.isStreaming ? (
                    <StreamingText text={message.text} speed={60} />
                  ) : (
                    <p>{message.text}</p>
                  )}
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <TypingIndicator />
              </div>
            )}
          </div>
        </div>

        {/* Fixed input area for mobile/tablet */}
        <div className="fixed bottom-20 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4 border-t border-border z-40 md:bottom-0 md:p-6">
          {renderInputArea()}
        </div>
      </div>

      {/* Desktop Layout (lg and up) */}
      <div className="hidden lg:flex lg:flex-col lg:h-full">
        {/* Fixed header */}
        <div className="p-4 border-b border-border md:p-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {renderFutureSelfAvatar()}
            </div>
            <div>
              <h1>Your Future Self</h1>
              <p className="text-muted-foreground text-sm">Ask yourself anything!</p>
            </div>
          </div>
        </div>

        {/* Messages area with independent scrolling */}
        <div 
          ref={desktopScrollRef}
          className="flex-1 p-8 pb-20 overflow-y-auto"
        >
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[60%] p-4 rounded-lg ${
                    message.isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {message.isStreaming ? (
                    <StreamingText text={message.text} speed={60} />
                  ) : (
                    <p>{message.text}</p>
                  )}
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <TypingIndicator />
              </div>
            )}
          </div>
        </div>

        {/* Fixed input area for desktop */}
        <div className="absolute bottom-0 left-0 lg:left-64 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4 border-t border-border z-40">
          {renderInputArea()}
        </div>
      </div>
    </>
  );
}