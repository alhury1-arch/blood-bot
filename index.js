const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const http = require('http');

// كود لإصلاح مشكلة المنفذ (Port) في Render
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is Running\n');
});
server.listen(process.env.PORT || 10000);

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
            console.log("---------------------------------------");
            console.log("امسح الكود التالي للربط:");
            qrcode.generate(qr, { small: true }); 
            console.log("---------------------------------------");
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('✅ تم الاتصال بنجاح - بوت بنك تهامة يعمل الآن');
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

                    const response = await axios.post('https://b-d.ct.ws/bot_api.php', params);
                    await sock.sendMessage(from, { text: response.data });
                } catch (error) {
                    await sock.sendMessage(from, { text: '❌ حدث خطأ في الاتصال بالسيرفر.' });
                }
            }
        }
    });
}
connectToWhatsApp();
