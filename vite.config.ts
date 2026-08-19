import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';

function geminiRagPlugin(): Plugin {
  return {
    name: 'gemini-rag-endpoint',
    configureServer(server) {
      server.middlewares.use('/api/rag-chat', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const { message, context, history = [], language = 'vi' } = data;

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                text: null, 
                fallbackReason: 'NO_API_KEY',
                message: 'No GEMINI_API_KEY found. Falling back to local RAG knowledge engine.' 
              }));
              return;
            }

            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                },
              },
            });

            const systemPrompt = `You are ViS-AI, the official intelligent travel and cultural companion for the ViS-Go platform in Vietnam (https://vis-go.vn).
Your exclusive specialty is authentic Vietnamese local travel, cultural experiences, street food, verified local buddies (hosts), booking & 100% Escrow payment protection, and insider travel tips in Vietnam.

CRITICAL SCOPE & BEHAVIOR RULES:
1. GREETINGS & INTRODUCTIONS:
   - If the user greets (e.g., "Xin chào", "Hello", "Hi", "Chào em", "Chào bạn") or asks for help ("Tôi cần bạn giúp", "Bạn là ai?", "Giới thiệu bản thân", "Bạn làm được gì?"):
     * Respond warmly, politely, and enthusiastically in ${language === 'vi' ? 'Tiếng Việt' : 'English'}.
     * Introduce yourself clearly as **ViS-AI** - the local travel companion of ViS-Go.
     * Give a friendly overview of how you can help (finding street food tours, connecting with verified local buddies, explaining 100% ViS-Go Escrow protection, planning trips in Hanoi, Saigon, Da Nang, Hoi An, Da Lat, etc.).

2. STRICT OFF-TOPIC REJECTION:
   - If the user asks questions OUTSIDE of Vietnam travel, Vietnamese culture, local food/places, and ViS-Go platform services (such as "Nước Đức ở đâu", "Thủ đô của Mỹ", solving math/equations, writing Python/JavaScript code, international politics, crypto, foreign geography, etc.):
     * POLITELY AND FIRMLY DECLINE.
     * Response template in Vietnamese:
       "Xin lỗi bạn, tôi là **ViS-AI** - trợ lý chuyên biệt về du lịch, văn hóa và kết nối bạn đồng hành bản địa tại Việt Nam trên ViS-Go 🇻🇳. Tôi chỉ có thể hỗ trợ các thông tin về tour trải nghiệm, ẩm thực ngõ hẻm, Host bản địa và dịch vụ ViS-Go tại Việt Nam. Bạn có muốn tôi gợi ý các tour độc bản tại Hà Nội, Sài Gòn, Đà Nẵng hay Hội An không ạ?"
     * Response template in English:
       "I apologize, but I am **ViS-AI**, dedicated exclusively to authentic Vietnamese local travel, verified buddies, and ViS-Go experiences in Vietnam 🇻🇳. I cannot answer queries unrelated to Vietnam tourism. Would you like me to recommend authentic cultural tours in Hanoi, Saigon, Da Nang, or Hoi An?"

3. VIETNAMESE TRAVEL & PLATFORM ANSWERS:
   - Use the live catalog context below to recommend real tours, exact prices (VND & USD), host names, ratings, and itineraries.
   - Explain our 100% Escrow Money-Back Guarantee and 24/7 GPS location support when asked about safety or booking.

Current Live Platform Knowledge (ViS-Go Catalog):
${context || 'No specific context provided.'}
`;

            const contents = [
              ...history.slice(-8).map((h: { role: string; text: string }) => ({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.text }],
              })),
              {
                role: 'user',
                parts: [{ text: message }],
              },
            ];

            const response = await ai.models.generateContent({
              model: 'gemini-3.7-flash',
              contents,
              config: {
                systemInstruction: {
                  parts: [{ text: systemPrompt }],
                },
                temperature: 0.7,
              },
            });

            const replyText = response.text || '';
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ text: replyText }));
          } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error('Error generating AI RAG response:', errorMessage);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ 
              text: null, 
              error: errorMessage,
              fallbackReason: 'GENERATION_ERROR' 
            }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), geminiRagPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
