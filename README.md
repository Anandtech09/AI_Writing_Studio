# AI Writing Studio

A professional AI-powered content generation platform with human-in-the-loop workflow, built with Angular and Google Gemini AI.

## 🌟 Features

### Content Generation

- **Multi-Platform Support**: Generate content optimized for LinkedIn, Facebook, Medium, Twitter, Instagram, and blogs
- **8 Content Types**: Articles, blog posts, essays, advertisements, scripts, emails, SEO content, and social posts
- **4 Tone Options**: Professional, casual, formal, and friendly
- **Flexible Length**: 100-2000 words with precise control
- **AI-Powered Image Suggestions**: 
  - **Unsplash Stock Images**: High-quality, curated stock photos (tagged as `unsplash`)
  - **Picsum Fallback**: Generic professional images (tagged as `stock`)
  - **Smart Keyword Extraction**: Extracts relevant keywords from content
  - **Automatic Fallback**: Gracefully handles API unavailability

### Human-in-the-Loop System

- **Review & Approval**: Review generated content before finalizing
- **Direct Editing**: Edit content directly in the interface
- **AI Refinement**: Request improvements with quick suggestions or custom prompts
- **Version History**: Track and restore previous versions
- **Draft/Approved Status**: Clear workflow states

### User Experience

- **Dark/Light Theme**: Toggle between themes with persistent preference
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Smooth Animations**: Professional transitions and loading states
- **Export Options**: Download as TXT, HTML, or PDF (with images)
- **Copy to Clipboard**: One-click content copying
- **Image Integration**: AI-generated images included in HTML and PDF exports

## 🏗️ Architecture

### Frontend

- **Framework**: Angular 17 (Standalone Components)
- **State Management**: Component-based with RxJS
- **Styling**: Custom CSS with dark mode support
- **HTTP Client**: Angular HttpClient with Fetch API

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **AI Integration**: Google Gemini 2.0 Flash API for content generation
- **Image Sources**: Unsplash API (stock photos) + Picsum (fallback)
- **API Documentation**: Swagger/OpenAPI

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- Unsplash API key (Optional - for relevant images) ([Get one here](https://unsplash.com/developers))

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd AI_Writing_Studio
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Configure environment**

   ```bash
   copy .env.example .env
   ```

   Edit `.env` and add your API keys:

   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
   PORT=3000
   ```

   **Note**: The Unsplash API key is optional. If not provided, the app will use fallback placeholder images.

4. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

**Option 1: Using helper scripts (Windows)**

Terminal 1 - Backend:

```bash
.\start-backend.bat
```

Terminal 2 - Frontend:

```bash
.\start-frontend.bat
```

**Option 2: Manual commands**

Terminal 1 - Backend:

```bash
cd backend
npm start
```

Terminal 2 - Frontend:

```bash
cd frontend
npx ng serve
```

### Access Points

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs

## �️ Image Generation System

### Image Generation Pipeline

The app uses a reliable, multi-source image system:

1. **Unsplash API** (Primary)
   - High-quality, curated stock photos
   - Tagged as `unsplash` in the response
   - Requires `UNSPLASH_ACCESS_KEY` environment variable
   - Sourced by intelligent keyword extraction from prompt

2. **Picsum Fallback** (Secondary)
   - Generic professional placeholder images
   - Tagged as `stock` in the response
   - Always available, no API key needed
   - Automatically used if Unsplash unavailable

### Response Format

```json
{
  "images": ["https://images.unsplash.com/...", "https://picsum.photos/..."],
  "imageTypes": ["unsplash", "stock", "stock"]
}
```

Image tags:
- `unsplash`: High-quality photo from Unsplash API
- `stock`: Generic fallback from Picsum service

##�📡 API Integration

### Generate Content Endpoint

**POST** `/api/generate`

**Request Body:**

```json
{
  "prompt": "Write about the future of AI in healthcare",
  "tone": "professional",
  "wordCount": 500,
  "contentType": "article",
  "platform": "linkedin"
}
```

**Response:**

```json
{
  "content": "Generated content text...",
  "wordCount": 487,
  "platform": "linkedin"
}
```

### Parameters

| Parameter   | Type   | Required | Options                                                        |
| ----------- | ------ | -------- | -------------------------------------------------------------- |
| prompt      | string | Yes      | Any text description                                           |
| tone        | string | No       | professional, casual, formal, friendly                         |
| wordCount   | number | No       | 100-2000 (default: 500)                                        |
| contentType | string | No       | article, blog, essay, ad, script, email, seo, social           |
| platform    | string | No       | standard, linkedin, facebook, medium, twitter, instagram, blog |

### Example Integration (JavaScript)

```javascript
async function generateContent(prompt) {
  const response = await fetch("http://localhost:3000/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt,
      tone: "professional",
      wordCount: 500,
      contentType: "article",
      platform: "standard",
    }),
  });

  const data = await response.json();
  return data.content;
}
```

### Example Integration (Python)

```python
import requests

def generate_content(prompt):
    url = 'http://localhost:3000/api/generate'
    payload = {
        'prompt': prompt,
        'tone': 'professional',
        'wordCount': 500,
        'contentType': 'article',
        'platform': 'standard'
    }

    response = requests.post(url, json=payload)
    data = response.json()
    return data['content']
```

### Example Integration (cURL)

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write about AI in education",
    "tone": "professional",
    "wordCount": 500,
    "contentType": "article",
    "platform": "standard"
  }'
```

## 🔧 Configuration

### Backend Configuration

Edit `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here  # Optional
PORT=3000
```

### Image Generation Setup (Optional)

The app uses AI to analyze your content and fetch relevant images from Unsplash:

1. **Get Unsplash API Key** (Free):
   - Go to https://unsplash.com/developers
   - Create an account or sign in
   - Create a new application
   - Copy your "Access Key"
   - Add it to `backend/.env` as `UNSPLASH_ACCESS_KEY`

2. **How it works**:
   - AI analyzes your content prompt and generated text
   - Extracts 3 relevant visual keywords (e.g., "technology" → "laptop coding", "data center", "digital network")
   - Fetches matching images from Unsplash
   - Falls back to placeholder images if API key is not configured

3. **Without API Key**:
   - App still works perfectly
   - Uses high-quality placeholder images instead

### Frontend Configuration

Edit `frontend/src/app/services/ai.service.ts`:

```typescript
private apiUrl = 'http://localhost:3000/api';
```

## 🎨 Customization

### Adding New Content Types

1. Update `frontend/src/app/app.component.ts`:

```typescript
contentTypes = [
  { value: "custom", label: "Custom Type" },
  // ... existing types
];
```

2. Update backend prompt handling in `backend/routes/generate.js` if needed.

### Adding New Platforms

1. Update `frontend/src/app/app.component.ts`:

```typescript
platforms = [
  { value: "custom", label: "Custom Platform" },
  // ... existing platforms
];
```

2. Add platform-specific instructions in `backend/routes/generate.js`:

```javascript
const platformInstructions = {
  custom: "Your custom formatting instructions...",
  // ... existing platforms
};
```

## 🛠️ Tech Stack

### Frontend

- Angular 17
- TypeScript
- RxJS
- CSS3 with animations
- SVG icons

### Backend

- Node.js
- Express.js
- Google Generative AI SDK
- Swagger UI Express
- dotenv

## 📝 API Documentation

Full interactive API documentation is available at:
http://localhost:3000/api-docs

The Swagger UI provides:

- Complete endpoint documentation
- Request/response schemas
- Interactive testing interface
- Example requests

## 🔒 Security Notes

- API keys are stored server-side only
- CORS is enabled for local development
- Environment variables for sensitive data
- No API keys exposed to frontend

## 🐛 Troubleshooting

### Backend won't start

- Check if port 3000 is already in use
- Verify Gemini API key is valid
- Run `npm install` in backend directory

### Frontend won't start

- Check if port 4200 is already in use
- Run `npm install` in frontend directory
- Clear Angular cache: `npx ng cache clean`

### API errors

- Verify backend is running
- Check API key is valid
- Review backend console for error messages
- Try alternative models if one is overloaded

### Model overload (503 errors)

- The backend automatically retries with fallback models
- Wait a few seconds and try again
- Check Google AI Studio for service status

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions:

- Check the documentation at http://localhost:4200 (click "Docs")
- Review API docs at http://localhost:3000/api-docs
- Open an issue on GitHub

## 🎯 Roadmap

- [ ] PDF export with formatting
- [ ] Image generation integration
- [ ] Multi-language support
- [ ] Content templates library
- [ ] Collaboration features
- [ ] Analytics dashboard
- [ ] Browser extension
- [ ] Mobile app

---

Built with ❤️ using Angular and Google Gemini AI
