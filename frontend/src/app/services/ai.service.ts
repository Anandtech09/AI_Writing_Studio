import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface GenerateRequest {
  prompt: string;
  tone: string;
  wordCount: number;
  contentType: string;
  platform: string;
}

export interface GenerateResponse {
  content: string;
  wordCount: number;
  images?: string[];
  imageTypes?: ('ai-generated' | 'stock')[];
}

@Injectable({
  providedIn: "root",
})
export class AiService {
  private apiUrl =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://ai-writing-studio-5gvx.vercel.app';


  constructor(private http: HttpClient) {}

  generateContent(request: GenerateRequest): Observable<GenerateResponse> {
    return this.http.post<GenerateResponse>(`${this.apiUrl}/api/generate`, request);
  }
}

