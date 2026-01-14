import { Component, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from './services/ai.service';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  prompt = '';
  tone = 'professional';
  wordCount = 500;
  contentType = 'article';
  platform = 'standard';
  generatedContent = '';
  actualWordCount = 0;
  isLoading = false;
  isRefining = false;
  error = '';
  refinePrompt = '';
  contentStatus: 'draft' | 'approved' | 'rejected' = 'draft';
  isEditing = false;
  editableContent = '';
  contentHistory: Array<{content: string, timestamp: Date}> = [];
  currentVersion = 0;
  contentImages: string[] = [];
  
  // Angular Signals for reactive state
  isDarkMode = signal(false);
  showColorPicker = signal(false);
  showDocs = signal(false);
  primaryColor = signal('#0ea5e9');
  secondaryColor = signal('#06b6d4');

  tones = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'formal', label: 'Formal' },
    { value: 'friendly', label: 'Friendly' }
  ];

  contentTypes = [
    { value: 'article', label: 'Article' },
    { value: 'blog', label: 'Blog Post' },
    { value: 'essay', label: 'Essay' },
    { value: 'ad', label: 'Advertisement' },
    { value: 'script', label: 'Script' },
    { value: 'email', label: 'Email' },
    { value: 'seo', label: 'SEO Content' },
    { value: 'social', label: 'Social Post' }
  ];

  platforms = [
    { value: 'standard', label: 'Standard' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'medium', label: 'Medium' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'blog', label: 'Blog' }
  ];

  constructor(private aiService: AiService) {
    // Load saved preferences or set defaults
    const savedPrimary = localStorage.getItem('primaryColor') || '#0ea5e9';
    const savedSecondary = localStorage.getItem('secondaryColor') || '#06b6d4';
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    
    this.primaryColor.set(savedPrimary);
    this.secondaryColor.set(savedSecondary);
    this.isDarkMode.set(savedDarkMode);
    
    // Effect to apply theme whenever it changes
    effect(() => {
      const primary = this.primaryColor();
      const secondary = this.secondaryColor();
      const isDark = this.isDarkMode();
      
      // Apply dark mode
      document.documentElement.classList.toggle('dark-mode', isDark);
      
      // Apply custom colors
      document.documentElement.style.setProperty('--color-primary', primary);
      document.documentElement.style.setProperty('--color-secondary', secondary);
      
      // Save preferences
      localStorage.setItem('primaryColor', primary);
      localStorage.setItem('secondaryColor', secondary);
      localStorage.setItem('darkMode', isDark.toString());
    });
  }

  setPresetColors(primary: string, secondary: string) {
    this.primaryColor.set(primary);
    this.secondaryColor.set(secondary);
  }

  setDarkMode(isDark: boolean) {
    this.isDarkMode.set(isDark);
  }

  updateTheme() {
    // Theme updates are handled automatically by the effect in constructor
    // This method exists for explicit calls from the template
  }

  get formattedContent(): string {
    if (!this.generatedContent) return '';
    
    let formatted = this.generatedContent
      // Convert **bold** to HTML
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert markdown headings first
      .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
      .replace(/^##\s+(.+)$/gm, '<h3>$1</h3>')
      .replace(/^#\s+(.+)$/gm, '<h2>$1</h2>')
      // Convert bullet points
      .replace(/^[•\-\*]\s+(.+)$/gm, '<li>$1</li>');
    
    // Split into paragraphs and process
    const paragraphs = formatted.split('\n\n');
    const processed = paragraphs.map(para => {
      para = para.trim();
      if (!para) return '';
      
      // Already formatted as heading
      if (para.startsWith('<h')) {
        return para;
      }
      
      // List items
      if (para.includes('<li>')) {
        return '<ul>' + para + '</ul>';
      }
      
      // Detect standalone lines that look like headings (Title Case, short, no punctuation at end)
      const lines = para.split('\n');
      if (lines.length === 1 && lines[0].length < 80 && 
          /^[A-Z][^.!?]*$/.test(lines[0]) && 
          !lines[0].startsWith('<')) {
        // Check if it's title case or all caps
        const words = lines[0].split(' ');
        const titleCase = words.every(w => /^[A-Z]/.test(w) || w.length <= 3);
        if (titleCase) {
          return `<h3>${lines[0]}</h3>`;
        }
      }
      
      // Regular paragraph
      return `<p>${para}</p>`;
    });
    
    return processed.join('');
  }

  generate() {
    if (!this.prompt.trim()) {
      this.error = 'Please enter a prompt';
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.generatedContent = '';
    this.actualWordCount = 0;

    this.aiService.generateContent({
      prompt: this.prompt,
      tone: this.tone,
      wordCount: this.wordCount,
      contentType: this.contentType,
      platform: this.platform
    }).subscribe({
      next: (response: any) => {
        this.generatedContent = response.content;
        this.actualWordCount = response.wordCount;
        this.contentStatus = 'draft';
        this.contentImages = response.images || [];
        this.addToHistory(response.content);
        this.isLoading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to generate content. Please try again.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  addToHistory(content: string) {
    this.contentHistory.unshift({
      content: content,
      timestamp: new Date()
    });
    this.currentVersion = 0;
  }

  loadVersion(index: number) {
    this.currentVersion = index;
    this.generatedContent = this.contentHistory[index].content;
    this.actualWordCount = this.generatedContent.split(/\s+/).length;
  }

  approveContent() {
    this.contentStatus = 'approved';
  }

  rejectContent() {
    this.contentStatus = 'rejected';
    this.generatedContent = '';
    this.contentHistory = [];
  }

  startEditing() {
    this.isEditing = true;
    this.editableContent = this.generatedContent;
  }

  saveEdit() {
    this.generatedContent = this.editableContent;
    this.actualWordCount = this.generatedContent.split(/\s+/).length;
    this.addToHistory(this.generatedContent);
    this.isEditing = false;
    this.contentStatus = 'draft';
  }

  cancelEdit() {
    this.isEditing = false;
    this.editableContent = '';
  }

  applySuggestion(suggestion: string) {
    this.refinePrompt = suggestion;
  }

  removeImage(index: number) {
    this.contentImages.splice(index, 1);
  }

  onImageError(index: number) {
    console.log('Image failed to load:', this.contentImages[index]);
    // Replace with a different random image
    const newImageId = Math.floor(Math.random() * 1000) + 1;
    const cacheBuster = Date.now();
    this.contentImages[index] = `https://picsum.photos/800/600?random=${newImageId}&t=${cacheBuster}`;
  }

  refineContent() {
    if (!this.refinePrompt.trim() || !this.generatedContent) {
      return;
    }

    this.isRefining = true;
    this.error = '';

    const refineRequest = {
      prompt: `You are refining existing content. Here is the original content:

---ORIGINAL CONTENT START---
${this.generatedContent}
---ORIGINAL CONTENT END---

REFINEMENT REQUEST: ${this.refinePrompt}

INSTRUCTIONS:
1. Apply ONLY the specific refinement requested above
2. Keep ALL other aspects of the content exactly the same (tone, structure, formatting, headings)
3. Maintain the same word count (approximately ${this.actualWordCount} words)
4. Preserve all formatting including **bold**, bullet points, and headings
5. Do NOT add meta-commentary or explanations
6. Return ONLY the refined content, nothing else

Provide the refined content now:`,
      tone: this.tone,
      wordCount: this.actualWordCount,
      contentType: this.contentType,
      platform: this.platform
    };

    this.aiService.generateContent(refineRequest).subscribe({
      next: (response: any) => {
        this.generatedContent = response.content;
        this.actualWordCount = response.wordCount;
        this.contentStatus = 'draft';
        this.addToHistory(response.content);
        this.isRefining = false;
        this.refinePrompt = '';
      },
      error: (err: any) => {
        this.error = 'Failed to refine content. Please try again.';
        this.isRefining = false;
        console.error(err);
      }
    });
  }

  downloadAsText() {
    const blob = new Blob([this.generatedContent], { type: 'text/plain' });
    this.downloadFile(blob, `${this.contentType}-${this.platform}-${Date.now()}.txt`);
  }

  downloadAsMarkdown() {
    const blob = new Blob([this.generatedContent], { type: 'text/markdown' });
    this.downloadFile(blob, `${this.contentType}-${this.platform}-${Date.now()}.md`);
  }

  downloadAsHTML() {
    // Generate images HTML if images exist
    let imagesHtml = '';
    if (this.contentImages && this.contentImages.length > 0) {
      imagesHtml = `
    <div class="images-section">
        <h2>Related Images</h2>
        <div class="images-grid">
            ${this.contentImages.map((img, i) => `
            <div class="image-item">
                <img src="${img}" alt="Content image ${i + 1}" />
            </div>
            `).join('')}
        </div>
    </div>`;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.contentType} - AI Writing Studio</title>
    <style>
        body {
            font-family: Georgia, serif;
            line-height: 1.8;
            max-width: 900px;
            margin: 2rem auto;
            padding: 2rem;
            color: #2c3e50;
            background: #fff;
        }
        h1 {
            color: #1e3c72;
            border-bottom: 3px solid #1e3c72;
            padding-bottom: 0.5rem;
            margin-bottom: 1rem;
        }
        h2 {
            color: #2c5282;
            margin-top: 2rem;
            margin-bottom: 1rem;
        }
        h3 {
            color: #2d3748;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
        }
        .meta {
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 2rem;
            padding: 1rem;
            background: #f7fafc;
            border-radius: 8px;
        }
        .content {
            margin-bottom: 2rem;
        }
        .content p {
            margin-bottom: 1rem;
        }
        .content ul {
            margin: 1rem 0;
            padding-left: 2rem;
        }
        .content li {
            margin-bottom: 0.5rem;
        }
        .content strong {
            color: #1a202c;
            font-weight: 600;
        }
        .images-section {
            margin: 2rem 0;
            padding: 1.5rem;
            background: #f7fafc;
            border-radius: 8px;
        }
        .images-section h2 {
            margin-top: 0;
            color: #2c5282;
        }
        .images-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        .image-item img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .footer {
            margin-top: 3rem;
            padding-top: 1rem;
            border-top: 1px solid #ddd;
            color: #999;
            font-size: 0.85rem;
            text-align: center;
        }
    </style>
</head>
<body>
    <h1>${this.contentType.charAt(0).toUpperCase() + this.contentType.slice(1)}</h1>
    <div class="meta">
        <strong>Tone:</strong> ${this.tone} | 
        <strong>Platform:</strong> ${this.platform} | 
        <strong>Words:</strong> ${this.actualWordCount} | 
        <strong>Generated:</strong> ${new Date().toLocaleDateString()}
    </div>
    ${imagesHtml}
    <div class="content">${this.formattedContent}</div>
    <div class="footer">
        Generated by AI Writing Studio
    </div>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    this.downloadFile(blob, `${this.contentType}-${Date.now()}.html`);
  }

  async downloadAsPDF() {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (2 * margin);
      let yPosition = margin;

      // Helper function to check if we need a new page
      const checkNewPage = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Title
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(this.contentType.charAt(0).toUpperCase() + this.contentType.slice(1), margin, yPosition);
      yPosition += 12;

      // Metadata
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const metaText = `Tone: ${this.tone} | Platform: ${this.platform} | Words: ${this.actualWordCount} | Generated: ${new Date().toLocaleDateString()}`;
      pdf.text(metaText, margin, yPosition);
      yPosition += 10;

      // Line separator
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Add images if they exist
      if (this.contentImages && this.contentImages.length > 0) {
        checkNewPage(60);
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Related Images', margin, yPosition);
        yPosition += 8;

        // Load and add images
        for (let i = 0; i < this.contentImages.length; i++) {
          try {
            checkNewPage(70);
            
            // Convert image to base64
            const imgData = await this.loadImageAsBase64(this.contentImages[i]);
            const imgWidth = contentWidth;
            const imgHeight = 60;
            
            pdf.addImage(imgData, 'JPEG', margin, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 5;
          } catch (error) {
            console.error(`Failed to load image ${i}:`, error);
          }
        }
        yPosition += 5;
      }

      // Content
      checkNewPage(20);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);

      // Parse and format content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.formattedContent;
      
      const processNode = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim() || '';
          if (text) {
            checkNewPage(10);
            const lines = pdf.splitTextToSize(text, contentWidth);
            pdf.text(lines, margin, yPosition);
            yPosition += lines.length * 6;
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          
          if (element.tagName === 'H2') {
            checkNewPage(15);
            yPosition += 5;
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            const text = element.textContent?.trim() || '';
            pdf.text(text, margin, yPosition);
            yPosition += 10;
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
          } else if (element.tagName === 'H3') {
            checkNewPage(12);
            yPosition += 3;
            pdf.setFontSize(13);
            pdf.setFont('helvetica', 'bold');
            const text = element.textContent?.trim() || '';
            pdf.text(text, margin, yPosition);
            yPosition += 8;
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
          } else if (element.tagName === 'P') {
            checkNewPage(10);
            const text = element.textContent?.trim() || '';
            if (text) {
              const lines = pdf.splitTextToSize(text, contentWidth);
              pdf.text(lines, margin, yPosition);
              yPosition += lines.length * 6 + 3;
            }
          } else if (element.tagName === 'UL') {
            Array.from(element.children).forEach(li => {
              checkNewPage(8);
              const text = li.textContent?.trim() || '';
              if (text) {
                pdf.circle(margin + 2, yPosition - 1, 0.8, 'F');
                const lines = pdf.splitTextToSize(text, contentWidth - 8);
                pdf.text(lines, margin + 6, yPosition);
                yPosition += lines.length * 6;
              }
            });
            yPosition += 3;
          } else if (element.tagName === 'STRONG') {
            pdf.setFont('helvetica', 'bold');
            Array.from(element.childNodes).forEach(child => processNode(child));
            pdf.setFont('helvetica', 'normal');
          } else {
            Array.from(element.childNodes).forEach(child => processNode(child));
          }
        }
      };

      Array.from(tempDiv.childNodes).forEach(node => processNode(node));

      // Footer
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          'Generated by AI Writing Studio',
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        pdf.text(
          `Page ${i} of ${totalPages}`,
          pageWidth - margin,
          pageHeight - 10,
          { align: 'right' }
        );
      }

      // Save PDF
      pdf.save(`${this.contentType}-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  }

  private loadImageAsBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          try {
            const dataURL = canvas.toDataURL('image/jpeg', 0.8);
            resolve(dataURL);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  copyToClipboard() {
    navigator.clipboard.writeText(this.generatedContent).then(() => {
      alert('✅ Content copied to clipboard!');
    }).catch(() => {
      alert('❌ Failed to copy content');
    });
  }

  private downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
