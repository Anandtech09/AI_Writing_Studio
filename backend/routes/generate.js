const express = require("express");
const { GoogleGenerativeAI, GoogleAIFileManager } = require("@google/generative-ai");

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Flag to track if we're rate limited (skip AI image generation)
let isRateLimited = false;
let rateLimitResetTime = 0;

// Check if we should skip AI image generation due to rate limits
function shouldSkipAIImageGeneration() {
  if (isRateLimited && Date.now() < rateLimitResetTime) {
    console.log("⏳ Skipping AI image generation due to rate limit");
    return true;
  }
  isRateLimited = false;
  return false;
}

// Gemini Imagen 3 - AI Image Generation
async function generateImageWithImagen(prompt, contentType) {
  if (shouldSkipAIImageGeneration()) return null;
  
  try {
    // Use Gemini's imagen-3.0-generate-002 model for image generation
    const imageModel = genAI.getGenerativeModel({ 
      model: "imagen-3.0-generate-002"
    });
    
    const imagePrompt = `Create a professional, high-quality illustration for: ${prompt}. 
Style: Modern, clean, suitable for ${contentType || 'article'}. 
Requirements: No text, visually appealing, professional quality.`;

    console.log("Generating image with Imagen 3:", imagePrompt.substring(0, 100) + "...");

    const result = await imageModel.generateContent({
      contents: [{ role: "user", parts: [{ text: imagePrompt }] }],
      generationConfig: {
        responseModalities: ["image", "text"],
        responseMimeType: "image/png"
      }
    });

    const response = result.response;
    
    // Check if we got an image in the response
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
          // Return base64 data URL
          const base64Image = part.inlineData.data;
          const mimeType = part.inlineData.mimeType;
          console.log("Successfully generated AI image with Imagen 3");
          return `data:${mimeType};base64,${base64Image}`;
        }
      }
    }
    
    console.log("No image in Imagen response, falling back");
    return null;
  } catch (error) {
    console.error("Imagen 3 image generation failed:", error.message);
    // Check for rate limit error
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
      isRateLimited = true;
      rateLimitResetTime = Date.now() + 60000; // Wait 60 seconds
      console.log("🚫 Rate limited - will skip AI image generation for 60s");
    }
    return null;
  }
}

// Alternative: Use Gemini 2.0 Flash for image generation (supports native image output)
async function generateImageWithGemini2Flash(prompt, contentType) {
  if (shouldSkipAIImageGeneration()) return null;
  
  try {
    const imageModel = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp"
    });
    
    const imagePrompt = `Generate an image: A professional, high-quality visual representation for "${prompt}". 
Style: Modern, clean design suitable for ${contentType || 'article'}.
The image should be visually striking and relevant to the topic.`;

    console.log("Generating image with Gemini 2.0 Flash...");

    const result = await imageModel.generateContent({
      contents: [{ role: "user", parts: [{ text: imagePrompt }] }],
      generationConfig: {
        responseModalities: ["image"],
      }
    });

    const response = result.response;
    
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
          const base64Image = part.inlineData.data;
          const mimeType = part.inlineData.mimeType;
          console.log("Successfully generated AI image with Gemini 2.0 Flash");
          return `data:${mimeType};base64,${base64Image}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Gemini 2.0 Flash image generation failed:", error.message);
    // Check for rate limit error
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
      isRateLimited = true;
      rateLimitResetTime = Date.now() + 60000; // Wait 60 seconds
      console.log("🚫 Rate limited - will skip AI image generation for 60s");
    }
    return null;
  }
}

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
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about', 'write', 'create', 'make', 'generate', 'content', 'article', 'blog', 'post'];
  
  const words = prompt.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.includes(w));
  
  // Get unique words and prioritize longer ones
  const uniqueWords = [...new Set(words)].sort((a, b) => b.length - a.length);
  
  // Take top 3 keywords
  const keywords = uniqueWords.slice(0, 3);
  
  // Add content type as fallback if needed
  if (keywords.length < 3 && contentType) {
    keywords.push(contentType);
  }
  
  return keywords.length > 0 ? keywords : [contentType || 'business', 'technology', 'professional'];
}

// Helper function to extract keywords (uses simple extraction to avoid rate limits)
async function extractImageKeywords(prompt, contentType, generatedContent) {
  // Use simple extraction to avoid API rate limits
  console.log("Using simple keyword extraction (rate-limit friendly)");
  return extractKeywordsSimple(prompt, contentType);
}

// Helper function to fetch images from Unsplash API
async function fetchUnsplashImages(keywords) {
  const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
  
  if (!UNSPLASH_ACCESS_KEY) {
    console.log("Unsplash API key not configured, using fallback images");
    return null;
  }

  try {
    const images = [];
    
    for (const keyword of keywords) {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=1&orientation=landscape`,
        {
          headers: {
            'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          images.push(data.results[0].urls.regular);
        }
      }
    }

    return images.length > 0 ? images : null;
  } catch (error) {
    console.error("Error fetching Unsplash images:", error);
    return null;
  }
}

// Helper function to generate relevant image suggestions
// Image 1: AI-generated using Gemini Imagen 3
// Images 2 & 3: Unsplash or Picsum fallback
async function generateImageSuggestions(prompt, contentType, generatedContent) {
  try {
    const images = [];
    
    // IMAGE 1: Generate with Gemini Imagen 3 (AI-generated)
    console.log("🎨 Generating AI image with Gemini Imagen 3...");
    let aiGeneratedImage = await generateImageWithImagen(prompt, contentType);
    
    // Fallback to Gemini 2.0 Flash if Imagen 3 fails
    if (!aiGeneratedImage) {
      console.log("Trying Gemini 2.0 Flash as fallback for AI image...");
      aiGeneratedImage = await generateImageWithGemini2Flash(prompt, contentType);
    }
    
    if (aiGeneratedImage) {
      images.push(aiGeneratedImage);
      console.log("✅ AI-generated image added as first image");
    }
    
    // IMAGES 2 & 3: Use Unsplash/Picsum (current implementation)
    console.log("📷 Fetching stock images for remaining slots...");
    const keywords = await extractImageKeywords(prompt, contentType, generatedContent);
    console.log("AI-extracted image keywords:", keywords);

    // Try to fetch real images from Unsplash for remaining slots
    const unsplashImages = await fetchUnsplashImages(keywords.slice(0, 2)); // Only need 2 more
    
    if (unsplashImages && unsplashImages.length > 0) {
      console.log(`Found ${unsplashImages.length} images from Unsplash`);
      images.push(...unsplashImages);
    }
    
    // Fill remaining slots with Picsum fallback
    const baseTime = Date.now();
    while (images.length < 3) {
      const index = images.length;
      const imageId = ((baseTime + index * 100) % 1000) + 1;
      const cacheBuster = baseTime + index;
      images.push(`https://picsum.photos/800/600?random=${imageId}&t=${cacheBuster}`);
    }

    console.log(`📸 Total images prepared: ${images.length} (1 AI-generated + ${images.length - 1} stock)`);
    return images.slice(0, 3); // Return exactly 3 images
  } catch (error) {
    console.error("Error generating image suggestions:", error);
    // Final fallback
    return [
      'https://picsum.photos/800/600?random=1',
      'https://picsum.photos/800/600?random=2',
      'https://picsum.photos/800/600?random=3'
    ];
  }
}

// Helper function to try multiple models with retry
async function generateWithRetry(prompt, maxRetries = 2) {
  // Updated model names - use current available models
  // See: https://ai.google.dev/gemini-api/docs/models/gemini
  const models = [
    "gemini-2.0-flash",           // Fastest, most available
    "gemini-1.5-flash-latest",    // Latest 1.5 flash
    "gemini-1.5-pro-latest",      // Latest 1.5 pro (fallback)
  ];

  for (const modelName of models) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (error) {
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
  throw new Error("All models failed after retries");
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
    const imageUrls = await generateImageSuggestions(prompt, contentType, text);

    res.json({
      content: text,
      wordCount: text.split(/\s+/).length,
      platform: platform || "standard",
      images: imageUrls,
      imageTypes: [
        imageUrls[0]?.startsWith('data:') ? 'ai-generated' : 'stock',
        'stock',
        'stock'
      ]
    });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: "Failed to generate content" });
  }
});

module.exports = router;
