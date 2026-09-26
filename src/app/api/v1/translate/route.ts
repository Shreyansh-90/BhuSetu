import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { successResponse, errorResponse } from '@/lib/api/response';

// Mock translation dictionary for SIH Hackathon Demo
// In production, this would make an external HTTP request to Bhashini APIs.
const MOCK_BHASHINI_DICTIONARY: Record<string, Record<string, string>> = {
  hi: {
    'Citizen Land Tracking Portal': 'नागरिक भूमि ट्रैकिंग पोर्टल',
    'Enter your 14-digit ULPIN (Bhu-Aadhaar) to check acquisition status, compensation, and R&R benefits.': 'अधिग्रहण की स्थिति, मुआवजा और पुनर्वास लाभों की जांच करने के लिए अपना 14 अंकों का ULPIN (भू-आधार) दर्ज करें।',
    'Enter 14-digit ULPIN': '14 अंकों का ULPIN दर्ज करें',
    'Track': 'ट्रैक करें',
    'Searching...': 'खोज रहे हैं...',
    'Parcel Details': 'पार्सल विवरण',
    'Owner Name': 'मालिक का नाम',
    'Survey No.': 'सर्वेक्षण संख्या',
    'Area': 'क्षेत्र',
    'Project Status': 'परियोजना की स्थिति',
    'Compensation Award': 'मुआवजा पुरस्कार',
    'Amount': 'राशि',
    'Status': 'स्थिति',
    'Rehabilitation & Resettlement (R&R)': 'पुनर्वास और पुनर्स्थापन (R&R)',
  },
  mr: {
    'Citizen Land Tracking Portal': 'नागरिक जमीन ट्रॅकिंग पोर्टल',
    'Track': 'ट्रॅक करा',
    'Owner Name': 'मालकाचे नाव',
  }
};

async function translateText(request: NextRequest, { logger }: ApiHandlerContext) {
  try {
    const { text, targetLanguage } = await request.json();
    
    if (!text || !targetLanguage) {
      return errorResponse('VALIDATION_ERROR', 'text and targetLanguage are required');
    }

    // Simulate Bhashini API network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Mock response logic
    let translatedText = text;
    if (MOCK_BHASHINI_DICTIONARY[targetLanguage] && MOCK_BHASHINI_DICTIONARY[targetLanguage][text]) {
      translatedText = MOCK_BHASHINI_DICTIONARY[targetLanguage][text];
    } else {
      // If we don't have a mock, just return original but flag it
      // translatedText = `[${targetLanguage.toUpperCase()}] ${text}`;
    }

    return successResponse({
      originalText: text,
      translatedText,
      sourceLanguage: 'en',
      targetLanguage,
      provider: 'Bhashini API (Mock)'
    });
    
  } catch (err) {
    logger.error('Bhashini translation failed', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Translation service unavailable.');
  }
}

export const POST = apiHandler(translateText);
