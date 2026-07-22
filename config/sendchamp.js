const axios = require('axios');

function getSendchampConfig() {
  const apiKey = process.env.SENDCHAMP_API_KEY;
  const sender = process.env.SENDCHAMP_SENDER;
  if (!apiKey || !sender) return null;
  return { apiKey, sender };
}

async function sendOtp({ phoneNumber, code, purpose }) {
  const cfg = getSendchampConfig();
  if (!cfg) {
    console.warn('[sendchamp] pas de config, OTP non envoyé. Clé à définir dans .env');
    return false;
  }

  const templateMap = {
    REGISTER: process.env.SENDCHAMP_TEMPLATE_REGISTER,
    LOGIN: process.env.SENDCHAMP_TEMPLATE_LOGIN,
    PASSWORD_RESET: process.env.SENDCHAMP_TEMPLATE_PASSWORD_RESET
  };

  const template = templateMap[purpose];
  if (!template) {
    console.warn(`[sendchamp] template manquant pour ${purpose}`);
    return false;
  }

  try {
    await axios.post(
      'https://api.sendchamp.com/v1/sms/send/template',
      {
        to: phoneNumber,
        sender: cfg.sender,
        template,
        data: { code }
      },
      {
        headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
        timeout: 5000 // 5 secondes max pour ne pas bloquer la connexion
      }
    );
    return true;
  } catch (e) {
    console.error('[sendchamp] sendOtp error:', e?.response?.data || e.message);
    return false;
  }
}

module.exports = { sendOtp };

