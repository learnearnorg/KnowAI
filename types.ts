
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export enum MessageSender {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system',
}

export interface UrlContextMetadataItem {
  retrievedUrl: string;
  urlRetrievalStatus: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: MessageSender;
  timestamp: Date;
  isLoading?: boolean;
  urlContext?: UrlContextMetadataItem[];
  videoUrl?: string; // URL for generated Veo video
}

export enum DocumentType {
  URL = 'url',
  FILE = 'file',
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  source: string; // URL or Base64
  mimeType?: string;
}

export interface URLGroup {
  id: string;
  name: string;
  documents: Document[];
}

export type LanguageCode = 'en' | 'es' | 'fr' | 'ja' | 'de' | 'ko' | 'zh' | 'ru' | 'mn';

export type Theme = 'light' | 'dark';

export type TranslationOverrides = Record<LanguageCode, Record<string, string>>;
