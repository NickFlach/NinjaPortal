import { db } from '@db';
import { createHash } from 'crypto';

interface TranslationVector {
  key: string;
  locale: string;
  embedding: number[];
  translation: string;
}

// In-memory vector store for our translations
const vectorStore = new Map<string, TranslationVector>();

// Simple cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Simple text to vector function (basic implementation)
function textToVector(text: string): number[] {
  const words = text.toLowerCase().split(/\W+/);
  const vector = new Array(128).fill(0); // Using 128-dimensional vectors
  
  words.forEach(word => {
    const hash = createHash('sha256').update(word).digest();
    for (let i = 0; i < 16; i++) {
      vector[i * 8] = hash[i] / 255;
    }
  });
  
  return vector;
}

export class RAGTranslator {
  // Add a translation to the vector store
  addTranslation(key: string, locale: string, translation: string) {
    const vector: TranslationVector = {
      key,
      locale,
      embedding: textToVector(key),
      translation
    };
    
    const storeKey = `${locale}:${key}`;
    vectorStore.set(storeKey, vector);
  }

  // Find the most similar translation
  async findSimilarTranslation(key: string, locale: string): Promise<string | null> {
    const queryVector = textToVector(key);
    let bestMatch: TranslationVector | null = null;
    let highestSimilarity = -1;

    // Find the most similar translation in our vector store
    for (const [_, vector] of vectorStore) {
      if (vector.locale === locale) {
        const similarity = cosineSimilarity(queryVector, vector.embedding);
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestMatch = vector;
        }
      }
    }

    // Only return matches above a certain threshold
    if (bestMatch && highestSimilarity > 0.8) {
      return bestMatch.translation;
    }

    return null;
  }

  // Initialize with basic translations
  initializeStore(messages: Record<string, Record<string, string>>) {
    Object.entries(messages).forEach(([locale, translations]) => {
      Object.entries(translations).forEach(([key, translation]) => {
        this.addTranslation(key, locale, translation);
      });
    });
  }
}

export const ragTranslator = new RAGTranslator();
