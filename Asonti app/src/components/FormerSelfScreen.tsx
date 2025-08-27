import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Clock, User, Calendar, ChevronRight, Archive, Loader2 } from 'lucide-react';
import { profileGuard } from '@/services/profileGuard';
import { useAuth } from '@/contexts/AuthContext';
import type { FutureSelfProfile } from '@/lib/supabase';

export function FormerSelfScreen() {
  const [archivedProfiles, setArchivedProfiles] = useState<FutureSelfProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<FutureSelfProfile | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadArchivedProfiles = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const profiles = await profileGuard.getArchivedProfiles(user.id);
        setArchivedProfiles(profiles);
      } catch (error) {
        console.error('Error loading archived profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadArchivedProfiles();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getProfileSummary = (profile: FutureSelfProfile) => {
    const attributeCount = profile.attributes ? Object.keys(profile.attributes).length : 0;
    const valueCount = (profile.current_values?.length || 0) + (profile.future_values?.length || 0);
    return `${attributeCount} character traits • ${valueCount} values defined`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (archivedProfiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6 mx-auto">
            <Archive className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="mb-4">Former Self Archive</h1>
          <p className="text-muted-foreground max-w-md">
            When you create new versions of your future self, your previous profiles will be archived here for reference.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="mb-2">Former Self Archive</h1>
            <p className="text-muted-foreground">
              Review your journey through different visions of your future self.
            </p>
          </div>

          <div className="space-y-4">
            {archivedProfiles.map((profile) => (
              <Card 
                key={profile.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedProfile(profile)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Future Self Profile</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Created {formatDate(profile.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {getProfileSummary(profile)}
                    </p>

                    {profile.hope && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          <span className="font-medium">Hope:</span> {profile.hope.substring(0, 100)}
                          {profile.hope.length > 100 && '...'}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {profile.completed_at && (
                          <Badge variant="success">
                            Completed
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          Archived
                        </Badge>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedProfile(null)}
        >
          <Card 
            className="w-full max-w-2xl max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Archived Profile Details</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedProfile(null)}
                >
                  Close
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Created</h3>
                  <p className="text-muted-foreground">{formatDate(selectedProfile.created_at)}</p>
                </div>

                {selectedProfile.hope && (
                  <div>
                    <h3 className="font-medium mb-2">Hope</h3>
                    <p className="text-muted-foreground">{selectedProfile.hope}</p>
                  </div>
                )}

                {selectedProfile.fear && (
                  <div>
                    <h3 className="font-medium mb-2">Fear</h3>
                    <p className="text-muted-foreground">{selectedProfile.fear}</p>
                  </div>
                )}

                {selectedProfile.feelings && (
                  <div>
                    <h3 className="font-medium mb-2">Feelings</h3>
                    <p className="text-muted-foreground">{selectedProfile.feelings}</p>
                  </div>
                )}

                {selectedProfile.day_in_life && (
                  <div>
                    <h3 className="font-medium mb-2">Day in Life</h3>
                    <p className="text-muted-foreground">{selectedProfile.day_in_life}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}