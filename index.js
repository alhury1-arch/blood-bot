const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

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
        if (qr) { qrcode.generate(qr, { small: true }); }
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

            // التحقق من فصيلة الدم المدخلة
            if (/^(A|B|AB|O)[+-]$/i.test(text)) {
                try {
                    const params = new URLSearchParams();
                    params.append('type', text);
                    params.append('api_key', 'Tehama_2026_Secure');

                    // تأكد من وضع رابط ملفك الصحيح هنا
                    const response = await axios.post('https://b-d.ct.ws/bot_api.php', params);
                    await sock.sendMessage(from, { text: response.data });
                } catch (error) {
                    await sock.sendMessage(from, { text: '❌ حدث خطأ أثناء الاتصال بقاعدة البيانات.' });
                }
            }
        }
    });
}
connectToWhatsApp();