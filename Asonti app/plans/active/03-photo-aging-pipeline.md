# Plan 03: Photo Aging Pipeline

## Overview
**Status:** Active  
**Priority:** Medium  
**Duration:** 1 day (8 hours)  
**Dependencies:** Plan 1 (Database Migration)  
**Created:** 2025-01-27  

## Objective
Integrate Replicate's SAM (Style-based Age Manipulation) model to age user photos by 20 years, creating a visual representation of their future self for the AI avatar.

## Context
Users need a visual connection to their future self. The SAM model by Yuval Alaluf can realistically age faces while preserving identity. This plan implements:
- Photo upload to Supabase Storage
- Processing through Replicate's SAM API
- Aged photo storage and display
- Fallback to default avatar if no photo provided
- Error handling for processing failures

## Documentation Research Findings (2024-2025)

### Replicate SAM Model
- **Model:** `yuval-alaluf/sam` on Replicate
- **Cost:** ~$0.0082 per run (121 runs per $1)
- **Approach:** Style-based regression for age transformation
- **Quality:** Preserves identity while realistically aging faces
- **Paper:** "Only a Matter of Style: Age Transformation Using a Style-Based Regression Model"

### Replicate API Integration
- **Client:** Use `replicate` npm package for JavaScript/React
- **Authentication:** API token in environment variables
- **Patterns:** Webhook callbacks or polling for results
- **Response Time:** Typically 10-30 seconds per image
- **Best Practice:** Use webhooks for production, polling for development

### React Integration Patterns (2024-2025)
- **State Management:** Use hooks for API state
- **Error Handling:** Implement retry logic with exponential backoff
- **Loading States:** Show progress during processing
- **Server Components:** Consider for secure API key handling
- **Performance:** Lazy load heavy components

## Success Criteria
- [ ] User can upload photo in wizard
- [ ] Photo ages by 20 years using SAM model
- [ ] Aged photo displays as future self avatar
- [ ] Processing completes within 60 seconds
- [ ] Graceful fallback for failures
- [ ] 100% test coverage for pipeline

## Test-Driven Development Plan

### Phase 1: Write Service Tests (1.5 hours)

#### 1.1 Replicate Service Tests
**File:** `src/services/__tests__/replicateService.test.ts`

```typescript
describe('ReplicateService - Photo Aging', () => {
  test('should initialize with valid API token')
  test('should reject initialization without token')
  test('should create prediction for valid image')
  test('should handle invalid image formats')
  test('should poll for completion status')
  test('should timeout after 60 seconds')
  test('should retry on transient failures')
})

describe('ReplicateService - Error Handling', () => {
  test('should handle API rate limits')
  test('should handle network errors')
  test('should handle invalid API responses')
  test('should provide meaningful error messages')
  test('should clean up failed predictions')
})
```

#### 1.2 Photo Upload Service Tests
**File:** `src/services/__tests__/photoUploadService.test.ts`

```typescript
describe('PhotoUploadService - Upload Flow', () => {
  test('should validate image file type')
  test('should enforce size limit (5MB)')
  test('should resize large images')
  test('should upload to Supabase Storage')
  test('should generate public URL')
  test('should handle upload failures')
})

describe('PhotoUploadService - Processing Pipeline', () => {
  test('should trigger aging after upload')
  test('should save both original and aged URLs')
  test('should update profile with aged photo')
  test('should clean up on failure')
})
```

### Phase 2: Implement Services (2 hours)

#### 2.1 Replicate Service Implementation
**File:** `src/services/replicateService.ts`

```typescript
interface AgeTransformationOptions {
  targetAge?: number // Default: +20 years
  preserveHairColor?: boolean
  outputFormat?: 'png' | 'jpeg'
}

class ReplicateService {
  private client: Replicate
  private readonly MAX_POLL_TIME = 60000 // 60 seconds
  private readonly POLL_INTERVAL = 2000 // 2 seconds
  
  constructor() {
    const token = import.meta.env.VITE_REPLICATE_API_TOKEN
    if (!token) throw new Error('Replicate API token required')
    
    this.client = new Replicate({ auth: token })
  }
  
  async agePhoto(imageUrl: string, options?: AgeTransformationOptions): Promise<string> {
    // Create prediction with SAM model
    const prediction = await this.createPrediction(imageUrl, options)
    
    // Poll for completion
    const result = await this.pollForCompletion(prediction.id)
    
    // Return aged image URL
    return result.output
  }
  
  private async createPrediction(imageUrl: string, options?: AgeTransformationOptions) {
    return await this.client.predictions.create({
      version: "d7129e88816823363aa5b41ed9aab6b9cb2996ce742c4169379cca5c40812b1f",
      input: {
        image: imageUrl,
        target_age: options?.targetAge || "20_years_older"
      }
    })
  }
  
  private async pollForCompletion(predictionId: string): Promise<Prediction> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < this.MAX_POLL_TIME) {
      const prediction = await this.client.predictions.get(predictionId)
      
      if (prediction.status === 'succeeded') {
        return prediction
      }
      
      if (prediction.status === 'failed') {
        throw new Error(`Aging failed: ${prediction.error}`)
      }
      
      await this.sleep(this.POLL_INTERVAL)
    }
    
    throw new Error('Aging timeout - took longer than 60 seconds')
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

#### 2.2 Photo Upload Service
**File:** `src/services/photoUploadService.ts`

```typescript
class PhotoUploadService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  
  async uploadAndAge(file: File, userId: string): Promise<{
    originalUrl: string
    agedUrl: string
  }> {
    // Validate file
    this.validateFile(file)
    
    // Upload original to Supabase
    const originalUrl = await this.uploadToStorage(file, userId, 'original')
    
    try {
      // Age the photo
      const agedUrl = await replicateService.agePhoto(originalUrl)
      
      // Save aged photo to Supabase
      const storedAgedUrl = await this.saveAgedPhoto(agedUrl, userId)
      
      return {
        originalUrl,
        agedUrl: storedAgedUrl
      }
    } catch (error) {
      // Clean up on failure
      await this.deleteFromStorage(originalUrl)
      throw error
    }
  }
  
  private validateFile(file: File): void {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Please upload JPEG, PNG, or WebP')
    }
    
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('File too large. Maximum size is 5MB')
    }
  }
  
  private async uploadToStorage(file: File, userId: string, type: string): Promise<string> {
    const fileName = `${userId}/${type}_${Date.now()}.${file.name.split('.').pop()}`
    
    const { data, error } = await supabase.storage
      .from('future-self-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    
    // Get public URL with image transformation
    const { data: { publicUrl } } = supabase.storage
      .from('future-self-photos')
      .getPublicUrl(fileName, {
        transform: {
          width: 512,
          height: 512,
          resize: 'cover'
        }
      })
    
    return publicUrl
  }
}
```

### Phase 3: Write UI Component Tests (1 hour)

#### 3.1 Photo Upload Component Tests
**File:** `src/components/wizard/__tests__/PhotoUploadStep.test.tsx`

```typescript
describe('PhotoUploadStep - Aging Integration', () => {
  test('should show upload button when no photo')
  test('should preview selected photo before upload')
  test('should show processing state during aging')
  test('should display aged photo when complete')
  test('should show error message on failure')
  test('should allow retry on failure')
  test('should proceed with default avatar if skipped')
})

describe('PhotoUploadStep - Progress Indication', () => {
  test('should show upload progress')
  test('should show aging progress')
  test('should update progress message')
  test('should show estimated time remaining')
})
```

### Phase 4: Update Photo Upload UI (1.5 hours)

#### 4.1 Enhanced Photo Upload Component
**File:** `src/components/wizard/PhotoUploadStep.tsx`

```typescript
const PhotoUploadStep = ({ onPhotoChange }) => {
  const [uploading, setUploading] = useState(false)
  const [aging, setAging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [agedPhoto, setAgedPhoto] = useState<string | null>(null)
  
  const handleFileSelect = async (file: File) => {
    setError(null)
    
    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    
    try {
      // Upload phase
      setUploading(true)
      setProgress(0)
      
      // Age photo phase
      setUploading(false)
      setAging(true)
      setProgress(50)
      
      const { originalUrl, agedUrl } = await photoUploadService.uploadAndAge(
        file,
        user.id
      )
      
      setAgedPhoto(agedUrl)
      onPhotoChange(agedUrl)
      setProgress(100)
      
    } catch (error) {
      setError(error.message)
    } finally {
      setUploading(false)
      setAging(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <h2>Upload Your Photo</h2>
      <p>We'll age your photo by 20 years to create your future self avatar</p>
      
      {!agedPhoto && (
        <UploadZone onFileSelect={handleFileSelect} disabled={uploading || aging} />
      )}
      
      {preview && !agedPhoto && (
        <div className="relative">
          <img src={preview} alt="Your photo" className="rounded-lg" />
          {(uploading || aging) && (
            <ProcessingOverlay 
              message={uploading ? "Uploading photo..." : "Aging your photo..."}
              progress={progress}
            />
          )}
        </div>
      )}
      
      {agedPhoto && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Current You</Label>
            <img src={preview} alt="Current" className="rounded-lg" />
          </div>
          <div>
            <Label>Future You (+20 years)</Label>
            <img src={agedPhoto} alt="Aged" className="rounded-lg" />
          </div>
        </div>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
          <Button onClick={retry} size="sm">Try Again</Button>
        </Alert>
      )}
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={skipPhoto}>
          Skip (Use Default Avatar)
        </Button>
        <Button onClick={proceed} disabled={!agedPhoto && !skipped}>
          Continue
        </Button>
      </div>
    </div>
  )
}
```

### Phase 5: Integration Tests (1 hour)

#### 5.1 End-to-End Pipeline Tests
**File:** `src/services/__tests__/photoAgingPipeline.integration.test.ts`

```typescript
describe('Photo Aging Pipeline - Integration', () => {
  test('complete flow: upload → age → save → display')
  test('handles network interruption during aging')
  test('cleans up resources on failure')
  test('respects user cancellation')
  test('works with different image formats')
  test('handles concurrent requests')
})
```

### Phase 6: Error Recovery & Monitoring (1 hour)

#### 6.1 Error Recovery System
**File:** `src/services/errorRecovery.ts`

```typescript
class PhotoProcessingRecovery {
  async recoverFailedAging(userId: string): Promise<void> {
    // Check for orphaned uploads
    const orphaned = await this.findOrphanedPhotos(userId)
    
    // Retry aging for recoverable failures
    for (const photo of orphaned) {
      await this.retryAging(photo)
    }
    
    // Clean up unrecoverable failures
    await this.cleanupFailed(userId)
  }
  
  private async retryAging(photo: OrphanedPhoto): Promise<void> {
    // Implement retry with exponential backoff
    // Maximum 3 retries
    // Clean up if all retries fail
  }
}
```

## Implementation Order

1. **Hour 1-2:** Write all service tests
2. **Hour 3-4:** Implement Replicate and upload services
3. **Hour 5:** Update UI components
4. **Hour 6:** Integration testing
5. **Hour 7:** Error recovery system
6. **Hour 8:** Documentation and deployment prep

## Technical Specifications

### Environment Variables
```env
VITE_REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxx
VITE_SUPABASE_STORAGE_URL=https://xxx.supabase.co/storage/v1
```

### Storage Bucket Configuration
```sql
-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('future-self-photos', 'future-self-photos', true);

-- Set policies for user access
CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'future-self-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'future-self-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### API Rate Limits
- Replicate: 100 requests per minute
- Implement queue for batch processing
- Cache aged photos for 30 days

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Replicate API down | High | Fallback to default avatar, queue for later |
| Slow processing | Medium | Show progress, allow skip |
| Poor photo quality | Medium | Validate minimum resolution |
| Privacy concerns | High | Clear data usage policy, allow deletion |
| Cost overrun | Medium | Monitor usage, set limits |

## Monitoring & Metrics

### Key Metrics
- Photo upload success rate (target: >95%)
- Aging completion rate (target: >90%)
- Average processing time (target: <30s)
- API cost per user (target: <$0.01)

### Analytics Events
- `photo_upload_started`
- `photo_upload_completed`
- `aging_started`
- `aging_completed`
- `aging_failed`
- `default_avatar_used`

## Rollback Plan
1. Disable aging feature flag
2. Use uploaded photo without aging
3. Fallback to avatar selection
4. Queue photos for batch processing

## Definition of Done

### Code Complete
- [ ] All service tests passing
- [ ] UI components updated
- [ ] Error handling implemented
- [ ] Integration tests passing
- [ ] Recovery system in place

### Quality Checks
- [ ] Processing under 60 seconds
- [ ] Graceful error handling
- [ ] Clear user feedback
- [ ] Cost within budget

### Deployment Ready
- [ ] Environment variables set
- [ ] Storage buckets configured
- [ ] Monitoring in place
- [ ] Documentation complete

## Dependencies
- Plan 1 (Database Migration) complete ✅
- Replicate API account created
- Supabase Storage configured
- Environment variables set

## Notes
- SAM model preserves identity well
- Consider A/B testing age amounts (+15, +20, +25 years)
- Monitor costs closely in early rollout
- Consider caching aged photos for popular demo accounts

## Documentation Sources & References

### Official Documentation
1. **Replicate SAM Model**  
   https://replicate.com/yuval-alaluf/sam
   
2. **Replicate JavaScript Client**  
   https://github.com/replicate/replicate-javascript
   
3. **Replicate HTTP API Reference**  
   https://replicate.com/docs/reference/http
   
4. **Supabase Storage Guide**  
   https://supabase.com/docs/guides/storage

### Model Information
5. **SAM GitHub Repository**  
   https://github.com/yuval-alaluf/SAM
   
6. **SAM Project Page**  
   https://yuval-alaluf.github.io/SAM/
   
7. **SAM Research Paper (ArXiv)**  
   https://arxiv.org/abs/2102.02754

### Integration Guides
8. **React API Integration Best Practices**  
   https://www.freecodecamp.org/news/how-work-with-restful-apis-in-react-simplified-steps-and-practical-examples/
   
9. **React Redux with API Integration**  
   https://medium.com/@kaklotarrahul79/building-a-react-redux-application-with-api-integration-a-step-by-step-guide-cf823c6622ff
   
10. **React Best Practices 2025**  
    https://www.lucentinnovation.com/blogs/it-insights/react-js-best-practices-2024-essential-techniques-for-modern-web-development

### Community Resources
11. **SAM Model on AI Models Directory**  
    https://www.aimodels.fyi/models/replicate/sam-yuval-alaluf
    
12. **Replicate NPM Package**  
    https://www.npmjs.com/package/replicate

### Key Takeaways from Sources
- **Model Cost:** ~$0.0082 per run, 121 runs per $1 (Source 1)
- **Model Version:** Use specific version ID for consistency (Source 3)
- **Processing Time:** Typically 10-30 seconds per image (Source 2)
- **Best Practice:** Use webhooks for production, polling for dev (Source 3)
- **Image Requirements:** Best results with clear, front-facing photos (Source 5)
- **React Pattern:** Use hooks for API state management (Source 10)

**Last Verified:** January 27, 2025