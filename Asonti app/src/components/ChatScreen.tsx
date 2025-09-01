import { useState, useEffect, useRef } from 'react';
import { Send, Mic, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { storage } from './hooks/useLocalStorage';
import { aiChatClient } from '@/services/aiChatClient';
import { TypingIndicator } from './TypingIndicator';
import { StreamingText } from './StreamingText';
import { supabase } from '@/lib/supabase';
import { useToast } from './ui/use-toast';

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

interface UserProfile {
  full_name?: string;
}

interface ChatScreenProps {
  scrollToBottom?: () => void;
  activeTab?: string;
}

export function ChatScreen({ scrollToBottom, activeTab }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [futureSelf, setFutureSelf] = useState<FutureSelfData>({ hasProfile: false });
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load profile data for avatar from Supabase
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Fetch user profile for name
        const { data: userProfileData } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();

        if (userProfileData?.full_name) {
          setUserProfile({ full_name: userProfileData.full_name });
        }

        const { data: profile, error } = await supabase
          .from('future_self_profiles')
          .select('photo_url, photo_type')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .single();

        if (profile) {
          setFutureSelf({
            hasProfile: true,
            photo: profile.photo_url,
          });
        }
      } catch (error) {
        console.error('Error loading profile for avatar:', error);
        // Profile might not exist yet, that's OK
      }
    };

    loadProfile();
  }, []);

  // Load messages from Supabase on component mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setDefaultMessage();
          return;
        }

        // First, get or create a conversation
        let activeConversationId = conversationId;
        
        if (!activeConversationId) {
          // Check for existing conversation
          const { data: existingConv } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (existingConv) {
            activeConversationId = existingConv.id;
          } else {
            // Create new conversation
            const { data: newConv, error: convError } = await supabase
              .from('chat_conversations')
              .insert({
                user_id: session.user.id,
                title: 'Chat with Future Self',
                created_at: new Date().toISOString()
              })
              .select()
              .single();
            
            if (convError) {
              console.error('Error creating conversation:', convError);
              return;
            }
            activeConversationId = newConv.id;
          }
          setConversationId(activeConversationId);
        }
        
        // Load messages from database
        const { data: dbMessages, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', activeConversationId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading messages from database:', error);
          setDefaultMessage();
          return;
        }

        if (dbMessages && dbMessages.length > 0) {
          const parsedMessages = dbMessages.map((msg: any) => ({
            id: msg.id,
            text: msg.content,
            isUser: msg.is_user,
            timestamp: new Date(msg.created_at)
          }));
          setMessages(parsedMessages);
          // Sync with chat service for context
          aiChatClient.setHistory(parsedMessages);
        } else {
          setDefaultMessage();
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        setDefaultMessage();
      }
    };

    loadMessages();
  }, [userProfile]);

  // Separate effect for real-time subscription
  useEffect(() => {
    let channel: any;

    const setupRealtimeSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      channel = supabase
        .channel(`chat_messages_${session.user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            // Add all new messages (both user and AI)
            const newMessage: Message = {
              id: payload.new.id,
              text: payload.new.content,
              isUser: payload.new.is_user,
              timestamp: new Date(payload.new.created_at)
            };
            
            // Check if message already exists to avoid duplicates
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (!exists) {
                return [...prev, newMessage];
              }
              return prev;
            });
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    // Cleanup subscription
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, []);

  const setDefaultMessage = () => {
    const firstName = userProfile.full_name?.split(' ')[0] || '';
    const greeting = firstName ? `Hello ${firstName}!` : 'Hello!';
    const welcomeMessage: Message = {
      id: '1',
      text: `${greeting} I'm here to help answer your questions. What would you like to know?`,
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

  // Messages are now saved to Supabase when sent, no need for localStorage

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
    if (!inputText || !inputText.trim() || isLoading) return;

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Not authenticated",
        description: "Please sign in to send messages",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    // Optimistically add to UI
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setIsTyping(true);
    setError(null);

    try {
      // Ensure we have a conversation ID
      let currentConversationId = conversationId;
      
      if (!currentConversationId) {
        // Create conversation if it doesn't exist
        const { data: newConv, error: convError } = await supabase
          .from('chat_conversations')
          .insert({
            user_id: session.user.id,
            title: 'Chat with Future Self',
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (convError || !newConv) {
          console.error('Error creating conversation:', convError);
          toast({
            title: "Error",
            description: "Failed to start conversation. Please try again.",
            variant: "destructive"
          });
          return;
        }
        currentConversationId = newConv.id;
        setConversationId(currentConversationId);
      }
      
      // Save user message to database
      const { error: saveError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: currentConversationId,
          user_id: session.user.id,
          content: userMessage.text,
          is_user: true,
          created_at: new Date().toISOString()
        });

      if (saveError) {
        console.error('Failed to save message:', saveError);
      }

      // Send message to AI service
      const { response, error: apiError } = await aiChatClient.sendMessage(userMessage.text, userProfile.full_name);
      
      if (apiError) {
        console.warn('AI service notice:', apiError);
      }
      
      // Stop typing indicator and add streaming response with a small delay
      const aiResponseId = (Date.now() + 1).toString();
      
      setTimeout(async () => {
        setIsTyping(false);
        
        const aiResponse: Message = {
          id: aiResponseId,
          text: response,
          isUser: false,
          timestamp: new Date(),
          isStreaming: true,
        };
        
        setMessages(prev => [...prev, aiResponse]);

        // Save AI response to database
        const { error: aiSaveError } = await supabase
          .from('chat_messages')
          .insert({
            conversation_id: currentConversationId,
            user_id: session.user.id,
            content: response,
            is_user: false,
            model_used: 'gpt-4o',
            created_at: new Date().toISOString()
          });

        if (aiSaveError) {
          console.error('Failed to save AI response:', aiSaveError);
        }
        
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
                    <div className="whitespace-pre-wrap break-words">{message.text}</div>
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
                    <div className="whitespace-pre-wrap break-words">{message.text}</div>
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