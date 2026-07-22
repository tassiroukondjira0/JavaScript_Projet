const crypto = require('crypto');

// Sendchamp SDK (SMS + WhatsApp)
const sendchamp = (() => {
  try {
    return require('sendchamp-sdk');
  } catch {
    return null;
  }
})();

function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

function hasSendchampConfig() {
  const pubKey = process.env.SENDCHAMP_PUBLIC_KEY;
  return Boolean(
    pubKey && pubKey.length > 10
  );
}

// Canal de verification unique : 'sms' ou 'whatsapp'
function getVerificationChannel() {
  const channel = String(process.env.VERIFICATION_CHANNEL || 'sms').toLowerCase();
  return channel === 'whatsapp' ? 'whatsapp' : 'sms';
}

// Validation de numero de telephone
function isValidPhone(phone) {
  const normalized = String(phone || '').replace(/[^\d+]/g, '').trim();
  return /^\+?[1-9]\d{7,14}$/.test(normalized);
}

// Normalisation d'email
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Validation simple de format email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

// Normalisation d'un nom d'utilisateur
function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

// Validation d'un nom d'utilisateur
function isValidUsername(username) {
  return /^[a-zA-Z0-9_.-]{3,30}$/.test(String(username || '').trim());
}

/**
 * Envoi de code de verification via Sendchamp (SMS ou WhatsApp)
 */
async function sendOtp({ channel, destination, code }) {
  if (!channel || !destination) {
    throw new Error('sendOtp: channel and destination are required');
  }

  const normalizedDestination = String(destination).trim();
  const normalizedChannel = String(channel).toLowerCase();

  const response = {
    sent: false,
    channel: normalizedChannel,
    destination: normalizedDestination
  };

  if (normalizedChannel !== 'sms' && normalizedChannel !== 'whatsapp') {
    response.error = 'Canal non supporte (utilisez sms ou whatsapp).';
    return response;
  }

  if (!sendchamp || !hasSendchampConfig()) {
    console.log(`[verification] ${normalizedChannel} non envoye (config Sendchamp absente) pour ${normalizedDestination} : ${code}`);
    response.error = 'Config Sendchamp absente';
    return response;
  }

  try {
    const Sendchamp = sendchamp.default || sendchamp;
    const sendchampInstance = new Sendchamp({
      publicKey: process.env.SENDCHAMP_PUBLIC_KEY
    });

    if (normalizedChannel === 'whatsapp') {
      const result = await sendchampInstance.WHATSAPP.sendText({
        number: normalizedDestination.replace(/^\+/, ''),
        message: `Votre code de verification Djokko est : ${code}`
      });
      console.log(`[verification] (whatsapp/sendchamp) OTP envoye a ${normalizedDestination}`);
      response.sent = true;
      return response;
    }

    const result = await sendchampInstance.SMS.send({
      to: [normalizedDestination],
      message: `Votre code de verification Djokko est : ${code}`,
      sender_name: process.env.SENDCHAMP_SENDER_ID || 'Djokko',
      route: 'dnd'
    });
    console.log(`[verification] (sms/sendchamp) SMS OTP envoye a ${normalizedDestination}`);
    response.sent = true;
    return response;
  } catch (sendchampError) {
    console.error(`[verification] Erreur Sendchamp OTP (${normalizedChannel}):`, sendchampError.message);
    response.error = sendchampError.message;
    return response;
  }
}

// ============================
// SENDCHAMP REST OTP (create/confirm)
// ============================

const axios = require('axios');

const SENDCHAMP_REST_URL = 'https://api.sendchamp.com/api/v1/verification';

function getSendchampRestHeaders() {
  return {
    Authorization: `Bearer ${process.env.SENDCHAMP_PUBLIC_KEY}`,
    'Content-Type': 'application/json'
  };
}

function normalizePhoneForSendchamp(destination) {
  return String(destination || '').trim();
}

async function sendOtpSendchampRest({ channel, destination, code }) {
  const normalizedChannel = String(channel).toLowerCase();
  const normalizedDestination = normalizePhoneForSendchamp(destination);

  if (normalizedChannel !== 'sms' && normalizedChannel !== 'whatsapp') {
    throw new Error('sendOtpSendchampRest: channel must be sms or whatsapp');
  }
  if (!normalizedDestination) {
    throw new Error('sendOtpSendchampRest: destination is required');
  }

  const apiKey = process.env.SENDCHAMP_PUBLIC_KEY;
  const isDevMode = process.env.NODE_ENV === 'development';
  const hasValidPubKey = apiKey && apiKey.length > 10;
  const forceSimulation = process.env.FORCE_SMS_SIMULATION === 'true';
  const pauseRealSend = process.env.SENDCHAMP_PAUSE === 'true';
  const fallbackSimulation = process.env.SENDCHAMP_FALLBACK_SIMULATION === 'true';

  // Génère une référence de simulation unique (reconnue par confirmOtpSendchampRest)
  function buildSimulatedResult(dest, code, reason) {
    console.log(`[verification] MODE SIMULATION (fallback ${reason}) - Envoi ${normalizedChannel} vers ${dest} (code: ${code})`);
    return {
      sent: true,
      channel: normalizedChannel,
      destination: dest,
      verification_reference: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      raw: { simulated: true, message: `Fallback simulation (${reason}) - no real SMS/WhatsApp sent` }
    };
  }

  // Pause / simulation de l'envoi réel (utile lorsque l'API Sendchamp pose problème)
  if (pauseRealSend || forceSimulation) {
    const reason = pauseRealSend ? 'SENDCHAMP_PAUSE' : 'FORCE_SMS_SIMULATION';
    return buildSimulatedResult(normalizedDestination, code, reason);
  }

  // En production: requiert une clé API valide
  // En développement: simule si pas de clé API (mais permet l'envoi réel si clé valide)
  if (!hasValidPubKey) {
    if (isDevMode) {
      console.log(`[verification] MODE DEV: Simulation car clé API non configurée pour ${normalizedDestination} (code: ${code})`);
      return {
        sent: true,
        channel: normalizedChannel,
        destination: normalizedDestination,
        verification_reference: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        raw: { simulated: true, message: 'No valid API key - simulating for development' }
      };
    } else {
      return {
        sent: false,
        channel: normalizedChannel,
        destination: normalizedDestination,
        error: 'Configuration Sendchamp manquante. Veuillez configurer SENDCHAMP_PUBLIC_KEY.'
      };
    }
  }

  const payload = {
    channel: normalizedChannel,
    token_type: 'numeric',
    token_length: 6,
    expiration_time: 5,
    sender: process.env.SENDCHAMP_SENDER_ID || 'Djokko',
    customer_mobile_number: normalizedDestination,
    meta_data: {
      app: process.env.SENDCHAMP_APP_NAME || 'Djokko'
    }
  };

  try {
    const response = await axios.post(`${SENDCHAMP_REST_URL}/create`, payload, {
      headers: getSendchampRestHeaders()
    });

    const responseData = response.data || {};
    const responseCode = responseData.code;

    if (responseCode >= 400 || responseData.status === 'failed') {
      const errorMessage = responseData.message || `Sendchamp error (code: ${responseCode})`;

      // Fallback automatique: si l'API renvoie une erreur, on simule l'envoi
      if (fallbackSimulation) {
        return buildSimulatedResult(normalizedDestination, code, 'api_error:' + (responseCode || 'unknown'));
      }

      return {
        sent: false,
        channel: normalizedChannel,
        destination: normalizedDestination,
        error: errorMessage,
        raw: responseData
      };
    }

    const verification_reference =
      responseData.verification_reference ||
      responseData.verificationReference ||
      responseData.token_reference ||
      responseData.tokenReference;

    return {
      sent: true,
      channel: normalizedChannel,
      destination: normalizedDestination,
      verification_reference,
      raw: responseData
    };
  } catch (axiosError) {
    let errorMessage;
    let responseData = null;
    if (axiosError.response) {
      responseData = axiosError.response.data || {};
      errorMessage = responseData.message || axiosError.message || 'Erreur Sendchamp inconnue';
    } else {
      errorMessage = axiosError.message || 'Erreur de connexion reseau vers Sendchamp';
    }

    // Fallback automatique: si l'appel réseau échoue, on simule l'envoi
    if (fallbackSimulation) {
      return buildSimulatedResult(normalizedDestination, code, 'request_failed');
    }

    if (axiosError.response) {
      return {
        sent: false,
        channel: normalizedChannel,
        destination: normalizedDestination,
        error: errorMessage,
        raw: responseData
      };
    }
    return {
      sent: false,
      channel: normalizedChannel,
      destination: normalizedDestination,
      error: errorMessage
    };
  }
}

async function confirmOtpSendchampRest({ verification_reference, verification_code }) {
  if (!verification_reference) {
    throw new Error('confirmOtpSendchampRest: verification_reference is required');
  }
  if (!verification_code) {
    throw new Error('confirmOtpSendchampRest: verification_code is required');
  }

  if (verification_reference.startsWith('sim_')) {
    console.log(`[verification] MODE DEV: Simulation de confirmation OTP`);
    return {
      status: 'success',
      verified: true,
      message: 'Verification simulated successfully'
    };
  }

  const response = await axios.post(
    `${SENDCHAMP_REST_URL}/confirm`,
    {
      verification_reference,
      verification_code
    },
    {
      headers: getSendchampRestHeaders()
    }
  );

  return response.data;
}

module.exports = {
  generateVerificationCode,
  sendOtp,
  hasSendchampConfig,
  getVerificationChannel,
  isValidPhone,
  normalizeEmail,
  isValidEmail,
  normalizeUsername,
  isValidUsername,
  sendOtpSendchampRest,
  confirmOtpSendchampRest
};