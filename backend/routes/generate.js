const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);

/**
 * @swagger
 * /api/generate:
 *   post:
 *     summary: Generate AI content
 *     description: Generate content using Google Gemini AI based on prompt, tone, word count, and content type
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: The content prompt or topic
 *                 example: Write about the benefits of AI in education
 *               tone:
 *                 type: string
 *                 description: The tone of the content
 *                 enum: [formal, casual, funny, professional]
 *                 example: professional
 *               wordCount:
 *                 type: number
 *                 description: Approximate word count for the content
 *                 example: 500
 *               contentType:
 *                 type: string
 *                 description: Type of content to generate
 *                 enum: [article, essay, ad, script, email, SEO content]
 *                 example: article
 *     responses:
 *       200:
 *         description: Content generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: string
 *                   description: The generated content
 *                 wordCount:
 *                   type: number
 *                   description: Actual word count of generated content
 *       400:
 *         description: Bad request - prompt is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Prompt is required
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to generate content
 */
// Simple keyword extraction without AI (to avoid rate limits)
function extractKeywordsSimple(prompt, contentType) {
  // Extract meaningful words from prompt
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about', 'write', 'create', 'make', 'generate', 'content', 'article', 'blog', 'post', 'essay', 'email', 'script', 'ad', 'seo', 'social'];
  
  const words = prompt.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.includes(w));
  
  // Get unique words and prioritize longer ones
  const uniqueWords = [...new Set(words)].sort((a, b) => b.length - a.length);
  
  // Take top 3 keywords from prompt only (don't use contentType)
  const keywords = uniqueWords.slice(0, 3);
  
  // If no keywords found, use generic fallbacks instead of contentType
  return keywords.length > 0 ? keywords : ['professional', 'business', 'content'];
}

// Helper function to extract keywords (uses simple extraction to avoid rate limits)
async function extractImageKeywords(prompt, contentType, generatedContent) {
  // Use simple extraction to avoid API rate limits
  console.log("Using simple keyword extraction (rate-limit friendly)");
  return extractKeywordsSimple(prompt, contentType);
}

// Helper function to fetch images from Unsplash API
async function fetchUnsplashImages(keywords) {
  const UNSPLASH_ACCESS_KEY = process.env.VITE_UNSPLASH_ACCESS_KEY;
  
  if (!UNSPLASH_ACCESS_KEY) {
    console.log("⚠️ Unsplash API key not configured, using fallback images only");
    return null;
  }

  try {
    const images = [];
    
    for (const keyword of keywords) {
      try {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=1&orientation=landscape`;
        console.log(`🔍 Searching Unsplash for: "${keyword}"`);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
          }
        });

        if (!response.ok) {
          console.warn(`❌ Unsplash API error for "${keyword}": ${response.status} ${response.statusText}`);
          continue;
        }

        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const imageUrl = data.results[0].urls.regular;
          console.log(`✅ Found image for "${keyword}": ${imageUrl}`);
          images.push({
            url: imageUrl,
            source: 'unsplash'
          });
        } else {
          console.log(`⚠️ No results found for keyword: "${keyword}"`);
        }
      } catch (keywordError) {
        console.error(`❌ Error fetching image for keyword "${keyword}":`, keywordError.message);
        continue;
      }
    }

    if (images.length > 0) {
      console.log(`✅ Successfully fetched ${images.length} images from Unsplash`);
      return images;
    } else {
      console.log("⚠️ No images were fetched from Unsplash, will use fallback");
      return null;
    }
  } catch (error) {
    console.error("❌ Error fetching Unsplash images:", error.message);
    return null;
  }
}

// Helper function to generate relevant image suggestions
// Use only Unsplash + Picsum stock images (Gemini doesn't support image output)
async function generateImageSuggestions(prompt, contentType, generatedContent) {
  try {
    const imageResults = [];  // Array of { url, source }
    
    console.log("\n🖼️ ========== IMAGE GENERATION START ==========");
    console.log("📷 Fetching stock images from Unsplash and fallbacks...");
    
    const keywords = await extractImageKeywords(prompt, contentType, generatedContent);
    console.log("📌 Keywords extracted:", keywords);

    // Try to fetch real images from Unsplash
    const unsplashImages = await fetchUnsplashImages(keywords.slice(0, 3));
    
    if (unsplashImages && unsplashImages.length > 0) {
      console.log(`✅ Got ${unsplashImages.length} from Unsplash`);
      imageResults.push(...unsplashImages);
    } else {
      console.log("⚠️ No Unsplash images returned");
    }
    
    // Fill remaining slots with Picsum fallback (stock)
    const baseTime = Date.now();
    const picumCount = 3 - imageResults.length;
    if (picumCount > 0) {
      console.log(`📦 Adding ${picumCount} Picsum fallback images...`);
      while (imageResults.length < 3) {
        const index = imageResults.length;
        const imageId = ((baseTime + index * 100) % 1000) + 1;
        const cacheBuster = baseTime + index;
        imageResults.push({
          url: `https://picsum.photos/800/600?random=${imageId}&t=${cacheBuster}`,
          source: 'stock'
        });
      }
    }

    const images = imageResults.slice(0, 3).map(img => img.url);
    const tags = imageResults.slice(0, 3).map(img => img.source);
    
    console.log(`📸 Final Result: ${images.length} images (${tags.filter(t => t === 'unsplash').length} Unsplash + ${tags.filter(t => t === 'stock').length} Picsum)`);
    console.log("✅ Images:", images);
    console.log("✅ Tags:", tags);
    console.log("🖼️ ========== IMAGE GENERATION END ==========\n");
    
    return {
      images,
      tags
    };
  } catch (error) {
    console.error("❌ Error in generateImageSuggestions:", error);
    console.log("🖼️ ========== IMAGE GENERATION END (ERROR) ==========\n");
    // Final fallback with proper structure
    return {
      images: [
        'https://picsum.photos/800/600?random=1',
        'https://picsum.photos/800/600?random=2',
        'https://picsum.photos/800/600?random=3'
      ],
      tags: ['stock', 'stock', 'stock']
    };
  }
}

// Helper function to try multiple models with retry
async function generateWithRetry(prompt, maxRetries = 2) {
  // Updated model names - use current available models
  // See: https://ai.google.dev/gemini-api/docs/models/gemini
  const models = [
    "gemini-2.5-flash",           // Fastest, most available
  ];

  for (const modelName of models) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (error) {
        // Check for quota/rate limit errors
        if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('429')) {
          console.error(
            `⚠️ Rate limited on ${modelName}: Quota exceeded. Waiting before retry...`
          );
          if (attempt < maxRetries - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, 2000 * (attempt + 1))
            );
          }
        } else if (error.status === 404) {
          console.log(`Model ${modelName} not available, trying next...`);
          break; // Skip to next model for 404 errors
        } else {
          console.log(
            `Attempt ${attempt + 1} with ${modelName} failed:`,
            error.message
          );
          if (attempt < maxRetries - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * (attempt + 1))
            );
          }
        }
      }
    }
  }
  throw new Error("All models failed after retries. Free tier quota may be exceeded. Please check your API billing at https://ai.google.dev/");
}

router.post("/", async (req, res) => {
  try {
    const { prompt, tone, wordCount, contentType, platform } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Platform-specific formatting instructions
    const platformInstructions = {
      standard: "Use clear paragraphs with proper spacing.",
      linkedin:
        "Format for LinkedIn: Use short paragraphs (2-3 lines), include relevant hashtags at the end, start with a hook, and use emojis sparingly for emphasis.",
      facebook:
        "Format for Facebook: Conversational tone, use line breaks for readability, include a call-to-action, and make it engaging for social sharing.",
      medium:
        "Format for Medium: Use a compelling title suggestion, include subheadings (marked with ##), write in a storytelling style, and structure with introduction, body, and conclusion.",
      twitter:
        "Format for Twitter/X: Create a thread-style format with numbered points, keep each section under 280 characters, use relevant hashtags.",
      instagram:
        "Format for Instagram caption: Start with an attention-grabbing first line, use line breaks, include relevant emojis, and add hashtags at the end.",
      blog: "Format as a blog post: Include a catchy title, introduction, multiple sections with subheadings, bullet points where appropriate, and a conclusion with call-to-action.",
    };

    const platformInstruction =
      platformInstructions[platform] || platformInstructions.standard;

    const enhancedPrompt = `Generate ${contentType || "content"} with a ${
      tone || "professional"
    } tone, approximately ${wordCount || 500} words.

Platform: ${platform || "standard"}
Formatting: ${platformInstruction}

Content request: ${prompt}

IMPORTANT FORMATTING RULES:
1. Use **bold** for key points and important phrases
2. Use bullet points (•) for lists
3. Mark section headings with ## (e.g., "## Benefits of Cloud Computing")
4. Mark sub-headings with ### if needed
5. Highlight main takeaways
6. Make it visually scannable and engaging
7. Use proper spacing between sections

CRITICAL: Provide ONLY the requested content. Do NOT include:
- Meta-commentary like "Here is...", "Here's a breakdown...", "I'll provide..."
- Explanations about what you're doing
- Introductory phrases about the content
- Any text that isn't part of the actual content itself

Start directly with the content.`;

    const text = await generateWithRetry(enhancedPrompt);

    // Generate image suggestions based on content using AI analysis
    // Uses Gemini Nano for AI generation and Unsplash for stock images
    let imageUrls = null;
    let imageTags = [];
    try {
      const imageResult = await generateImageSuggestions(prompt, contentType, text);
      if (imageResult) {
        imageUrls = imageResult.images;
        imageTags = imageResult.tags;
      }
    } catch (imageError) {
      console.warn("⚠️ Image generation failed, returning content without images:", imageError.message);
      imageUrls = null;
      imageTags = [];
    }

    res.json({
      content: text,
      wordCount: text.split(/\s+/).length,
      platform: platform || "standard",
      images: imageUrls || [],
      imageTypes: imageTags.length > 0 ? imageTags : []
    });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ 
      error: "Failed to generate content. " + 
             (error.message.includes("quota") ? 
              "Free tier quota exceeded. Please upgrade your plan at https://ai.google.dev/" : 
              error.message)
    });
  }
});

module.exports = router;
