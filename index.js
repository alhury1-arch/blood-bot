const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const http = require('http');

// Simple HTTP server to keep Render alive
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is Active\n');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: require('pino')({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) { 
            console.log("------------------- QR CODE START -------------------");
            qrcode.generate(qr, { small: true }); 
            console.log("\nFallback QR URL:");
            console.log("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(qr));
            console.log("-------------------- QR CODE END --------------------");
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('Bot Connected Successfully!');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && msg.message?.conversation) {
            let text = msg.message.conversation.trim().toUpperCase();
            const from = msg.key.remoteJid;

            if (/^(A|B|AB|O)[+-]$/i.test(text)) {
                try {
                    const params = new URLSearchParams();
                    params.append('type', text);
                    params.append('api_key', 'Tehama_2026_Secure');

                    // Make sure this URL matches your bot_api.php location
                    const response = await axios.post('https://b-d.ct.ws/bot_api.php', params);
                    await sock.sendMessage(from, { text: response.data });
                } catch (error) {
                    console.log('API connection error');
                }
            }
        }
    });
}

connectToWhatsApp();
