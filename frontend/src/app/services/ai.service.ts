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
}

@Injectable({
  providedIn: "root",
})
export class AiService {
  private apiUrl = "http://localhost:3100/api";

  constructor(private http: HttpClient) {}

  generateContent(request: GenerateRequest): Observable<GenerateResponse> {
    return this.http.post<GenerateResponse>(`${this.apiUrl}/generate`, request);
  }
}
