import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { MessageCircle, User, TrendingUp, Brain, Lightbulb, Target, CheckCircle, Star, Users } from 'lucide-react';
import { storage } from './hooks/useLocalStorage';
import { Logo } from './Logo';
import { Footer } from './Footer';

interface LandingScreenProps {
  onRegistrationComplete: () => void;
}

export function LandingScreen({ onRegistrationComplete }: LandingScreenProps) {
  const [activeTab, setActiveTab] = useState('signup');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Apply dark mode if enabled
  useEffect(() => {
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (error) {
        console.error('Error loading dark mode setting:', error);
      }
    }
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const requiredFields = activeTab === 'signup' 
      ? ['name', 'email', 'password']
      : ['email', 'password'];
    
    const isValid = requiredFields.every(field => formData[field as keyof typeof formData].trim());
    
    if (!isValid) return;

    setIsSubmitting(true);

    // Simulate authentication process
    setTimeout(() => {
      // Store authentication data for testing
      storage.setItem('user-registration', {
        name: formData.name.trim() || 'User',
        email: formData.email.trim(),
        authenticatedAt: new Date().toISOString(),
        isRegistered: true,
        authMethod: activeTab
      });

      setIsSubmitting(false);
      onRegistrationComplete();
    }, 1000);
  };

  const isFormValid = activeTab === 'signup' 
    ? formData.name.trim() && formData.email.trim() && formData.password.trim()
    : formData.email.trim() && formData.password.trim();

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/5 via-background to-accent/20 lg:min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Navigation */}
          <div className="flex items-center justify-between py-6">
            <div className="flex flex-col">
              <Logo size={40} showText={true} className="text-primary" />
            </div>
          </div>

          {/* Main Hero Content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center py-12 lg:py-20">
            {/* Left Column - Hero Text */}
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium leading-tight">
                  Meet your future self.<br />
                  <span className="text-primary">Become who you're meant to be</span>
                </h1>
                
                <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                  <p className="text-large">
                    Asonti connects you with your AI future self to help you make smarter choices today and become the person you are meant to be.
                  </p>
                  <p className="text-large">
                    For ambitious professionals who want more: Asonti lets you simulate your future, unlock your potential, and stay ahead.
                  </p>
                  <p className="text-foreground font-medium text-large">
                    Asonti uses AI to bridge the gap between who you are and who you want to be.
                  </p>
                </div>
              </motion.div>

              {/* Social Proof */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex items-center gap-6 text-sm text-muted-foreground"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>2,500+ professionals</span>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                  ))}
                  <span className="ml-1">4.9/5 rating</span>
                </div>
              </motion.div>

              {/* Key Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                <div className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border shadow-sm">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">AI Future Self</p>
                    <p className="text-xs text-muted-foreground">Personalized conversations</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border shadow-sm">
                  <div className="w-12 h-12 rounded-lg bg-accent-background flex items-center justify-center">
                    <Target className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Goal Clarity</p>
                    <p className="text-xs text-muted-foreground">Define your path</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border shadow-sm">
                  <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Smart Insights</p>
                    <p className="text-xs text-muted-foreground">Data-driven guidance</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column - Login/Signup Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="w-full max-w-md mx-auto lg:mx-0"
            >
              <Card className="border-border shadow-lg">
                <CardHeader className="text-center pb-4">
                  <h2 className="text-xl font-medium">Start Your Journey</h2>
                  <p className="text-sm text-muted-foreground">
                    Join 2,500+ professionals building their future
                  </p>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-11 p-1">
                      <TabsTrigger value="signup" className="h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm">Sign Up</TabsTrigger>
                      <TabsTrigger value="login" className="h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm">Log In</TabsTrigger>
                    </TabsList>
                    
                    <div className="mt-6 relative" style={{ minHeight: '300px' }}>
                      <AnimatePresence mode="wait">
                        {activeTab === 'signup' && (
                          <motion.div
                            key="signup"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="space-y-4"
                          >
                            <form onSubmit={handleSubmit} className="space-y-4">
                              <div className="space-y-2">
                                <label htmlFor="signup-name" className="text-sm font-medium">
                                  Your name
                                </label>
                                <Input
                                  id="signup-name"
                                  type="text"
                                  value={formData.name}
                                  onChange={(e) => handleInputChange('name', e.target.value)}
                                  placeholder="Enter your first name"
                                  className="bg-input-background border-border h-11"
                                  required
                                />
                              </div>

                              <div className="space-y-2">
                                <label htmlFor="signup-email" className="text-sm font-medium">
                                  Email address
                                </label>
                                <Input
                                  id="signup-email"
                                  type="email"
                                  value={formData.email}
                                  onChange={(e) => handleInputChange('email', e.target.value)}
                                  placeholder="your@email.com"
                                  className="bg-input-background border-border h-11"
                                  required
                                />
                              </div>

                              <div className="space-y-2">
                                <label htmlFor="signup-password" className="text-sm font-medium">
                                  Password
                                </label>
                                <Input
                                  id="signup-password"
                                  type="password"
                                  value={formData.password}
                                  onChange={(e) => handleInputChange('password', e.target.value)}
                                  placeholder="Create a secure password"
                                  className="bg-input-background border-border h-11"
                                  required
                                />
                              </div>

                              <Button 
                                type="submit" 
                                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground h-11 mt-6 font-medium"
                                disabled={!isFormValid || isSubmitting}
                              >
                                {isSubmitting ? 'Creating your account...' : 'Start Building Your Future'}
                              </Button>
                            </form>
                          </motion.div>
                        )}

                        {activeTab === 'login' && (
                          <motion.div
                            key="login"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="space-y-4"
                          >
                            <form onSubmit={handleSubmit} className="space-y-4">
                              <div className="space-y-2">
                                <label htmlFor="login-email" className="text-sm font-medium">
                                  Email address
                                </label>
                                <Input
                                  id="login-email"
                                  type="email"
                                  value={formData.email}
                                  onChange={(e) => handleInputChange('email', e.target.value)}
                                  placeholder="your@email.com"
                                  className="bg-input-background border-border h-11"
                                  required
                                />
                              </div>

                              <div className="space-y-2">
                                <label htmlFor="login-password" className="text-sm font-medium">
                                  Password
                                </label>
                                <Input
                                  id="login-password"
                                  type="password"
                                  value={formData.password}
                                  onChange={(e) => handleInputChange('password', e.target.value)}
                                  placeholder="Enter your password"
                                  className="bg-input-background border-border h-11"
                                  required
                                />
                                <div className="text-right">
                                  <button
                                    type="button"
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                    onClick={() => {/* TODO: Implement forgot password */}}
                                  >
                                    Forgot your password?
                                  </button>
                                </div>
                              </div>

                              <Button 
                                type="submit" 
                                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground h-11 mt-6 font-medium"
                                disabled={!isFormValid || isSubmitting}
                              >
                                {isSubmitting ? 'Signing you in...' : 'Continue Your Journey'}
                              </Button>
                            </form>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Trust Indicators */}
              <div className="mt-6 text-center space-y-3">
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span>Secure & Private</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span>No Credit Card</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Background Pattern */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-accent/5 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-medium mb-4">Built for ambitious professionals</h2>
            <p className="text-large text-muted-foreground max-w-2xl mx-auto">
              Unlock your potential with AI-powered self-discovery and personalized guidance
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageCircle,
                title: "Personalized AI Conversations",
                description: "Chat with your future self to gain insights and clarity on important decisions",
                color: "primary"
              },
              {
                icon: User,
                title: "Future Self Profile", 
                description: "Build a detailed vision of who you want to become and track your progress",
                color: "accent"
              },
              {
                icon: TrendingUp,
                title: "Growth Tracking",
                description: "Monitor your development journey with data-driven insights and recommendations",
                color: "secondary"
              }
            ].map((feature, index) => {
              const Icon = feature.icon;
              const colorClasses = {
                primary: "bg-primary/10 text-primary",
                accent: "bg-accent-background text-accent", 
                secondary: "bg-secondary/10 text-secondary"
              };
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center space-y-6 p-6 rounded-xl bg-card border border-border shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${colorClasses[feature.color as keyof typeof colorClasses]}`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-medium">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}