import axios from 'axios';
import WebSocket from 'ws';

export default async function handler(req, res) {
  const { prompt, model = 'gpt-5' } = req.body || {};

  if (!prompt)
    return res.status(400).json({ error: 'Prompt tidak boleh kosong.' });

  try {
    const copilot = new Copilot();
    const result = await copilot.chat(prompt, { model });

    return res.status(200).json({
      reply: result.text || '(Tidak ada respons)',
      citations: result.citations || []
    });
  } catch (err) {
    console.error('Copilot error:', err.message);
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan' });
  }
}

class Copilot {
  constructor() {
    this.conversationId = null;
    this.models = {
      default: 'chat',
      'think-deeper': 'reasoning',
      'gpt-5': 'smart'
    };
    this.headers = {
      origin: 'https://copilot.microsoft.com',
      'user-agent':
        'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
    };
  }

  async createConversation() {
    const { data } = await axios.post(
      'https://copilot.microsoft.com/c/api/conversations',
      null,
      { headers: this.headers }
    );
    this.conversationId = data.id;
    return this.conversationId;
  }

  async chat(message, { model = 'gpt-5' } = {}) {
    if (!this.conversationId) await this.createConversation();
    if (!this.models[model])
      throw new Error(
        `Model tidak tersedia! Pilihan: ${Object.keys(this.models).join(', ')}`
      );

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(
        `wss://copilot.microsoft.com/c/api/chat?api-version=2&features=-,ncedge,edgepagecontext&setflight=-,ncedge,edgepagecontext&ncedge=1`,
        { headers: this.headers }
      );

      const response = { text: '', citations: [] };

      ws.on('open', () => {
        ws.send(
          JSON.stringify({
            event: 'setOptions',
            supportedFeatures: ['partial-generated-images']
          })
        );

        ws.send(
          JSON.stringify({
            event: 'send',
            mode: this.models[model],
            conversationId: this.conversationId,
            content: [{ type: 'text', text: message }],
            context: {}
          })
        );
      });

      ws.on('message', (chunk) => {
        try {
          const parsed = JSON.parse(chunk.toString());
          switch (parsed.event) {
            case 'appendText':
              response.text += parsed.text || '';
              break;
            case 'citation':
              response.citations.push({
                title: parsed.title,
                icon: parsed.iconUrl,
                url: parsed.url
              });
              break;
            case 'done':
              resolve(response);
              ws.close();
              break;
            case 'error':
              reject(new Error(parsed.message));
              ws.close();
              break;
          }
        } catch (error) {
          reject(error.message);
        }
      });

      ws.on('error', reject);
    });
  }
}
