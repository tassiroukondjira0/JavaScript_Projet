// Ensure fetch sends cookies for same-origin requests so session cookies remain available.
// IMPORTANT: this file must NOT affect server-rendered EJS auth pages when disabled.
if (!window.__DJOKKO_DISABLE_AUTH_JS__) {
  // Avoid redeclaring `originalFetch` if this script is loaded multiple times.
  const ensureFetchWithCredentials = () => {
    const currentFetch = window.fetch;
    if (!currentFetch || currentFetch.__djokko_credentials_patched) return;

    const originalFetch = currentFetch.bind(window);
    const patched = (url, options = {}) => originalFetch(url, {
      credentials: 'include',
      ...options
    });
    patched.__djokko_credentials_patched = false;
    window.fetch = patched;
  };

  ensureFetchWithCredentials();
}



// NOTE: La logique de création de compte est gérée uniquement dans `initAuthPage()`.
// On évite ainsi les conflits entre deux implémentations concurrentes.


function initAuthPage() {
  // Prevent conflicts with the EJS-based auth flow for OTP.
  // The legacy auth flow in this file uses /api/auth/* endpoints which don't match
  // the server-rendered OTP pages handled by /auth/otp?purpose=...
  if (window.__DJOKKO_DISABLE_AUTH_JS__) return;
  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');
  const alertMsg = document.getElementById('alert-msg');
  const verificationStep = document.getElementById('verification-step');
  const verificationCodeInput = document.getElementById('verification-code');

  const verifyPhoneButton = document.getElementById('btn-verify-phone');
  const resendCodeButton = document.getElementById('btn-resend-code');
  const verificationInstructions = document.getElementById('verification-instructions');

  let pendingUserEmail = null;
  let isLoginSubmitting = false;
  let isRegisterSubmitting = false;
  let loginSubmitButton = null;
  let registerSubmitButton = null;

  function showAlert(msg) {
    if (alertMsg) {
      alertMsg.textContent = msg;
      alertMsg.style.display = 'block';
    }
  }

  function hideAlert() {
    if (alertMsg) {
      alertMsg.style.display = 'none';
    }
  }

  function setSubmitButtonState(button, submitting, idleText, submittingText) {
    if (!button) return;
    button.disabled = submitting;
    button.textContent = submitting ? submittingText : idleText;
  }

  async function handleLoginSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (isLoginSubmitting) return;
    hideAlert();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
      showAlert('Email et mot de passe sont requis.');
      return;
    }

    isLoginSubmitting = true;
    setSubmitButtonState(loginSubmitButton, true, 'Se connecter', 'Connexion...');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identifier: email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert(data.error || 'Identifiants incorrects.');
        return;
      }

      if (data.requiresTwoFactor) {
        pendingUserEmail = data.email;
const event = new CustomEvent('show-login-verification', {
          detail: {
            userId: data.userId,
            email: data.email,
            debugCode: data.debugCode
          }
        });
        window.dispatchEvent(event);
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Login error:', err);
      showAlert('Une erreur réseau est survenue. Veuillez réessayer.');
    } finally {
      isLoginSubmitting = false;
      setSubmitButtonState(loginSubmitButton, false, 'Se connecter', 'Connexion...');
    }
  }

  async function handleRegisterSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (isRegisterSubmitting) return;
    hideAlert();

    const firstname = document.getElementById('firstname').value.trim();
    const lastname = document.getElementById('lastname').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const phoneInput = document.getElementById('phone');
    const phoneCountrySelect = document.getElementById('phone-country');
    const rawPhone = phoneInput ? phoneInput.value.trim() : '';
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password') ? document.getElementById('confirm_password').value : '';
    const dateOfBirth = document.getElementById('date_of_birth') ? document.getElementById('date_of_birth').value : '';

    if (!firstname || !lastname || !username || !email || !rawPhone || !password || !confirmPassword || !dateOfBirth) {
      showAlert('Tous les champs sont requis.');
      return;
    }

    if (password.length < 8) {
      showAlert('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    let phone = rawPhone.replace(/[^\d+]/g, '').trim();
    const selectedCountryCode = phoneCountrySelect ? phoneCountrySelect.value : '';
    if (phoneCountrySelect && phone && !phone.startsWith('+')) {
      const countryCode = selectedCountryCode.replace(/\D/g, '');
      phone = `+${countryCode}${phone.replace(/\D/g, '')}`;
    }

    isRegisterSubmitting = true;
    setSubmitButtonState(registerSubmitButton, true, 'Créer un compte', 'Création...');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
body: JSON.stringify({ firstname, lastname, username, email, phone, password, confirm_password: confirmPassword, date_of_birth: dateOfBirth, countryCode: selectedCountryCode })
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert(data.error || 'Erreur lors de l\'inscription.');
        return;
      }

      pendingUserEmail = data.email;
      if (verificationStep) {
        verificationStep.style.display = 'block';
        verificationCodeInput.value = '';
        if (data.debugCode) {
          if (verificationInstructions) {
            verificationInstructions.textContent = 'Code de démonstration (simulation SMS) : ' + data.debugCode + ' — saisissez-le ci-dessous.';
          }
        } else if (verificationInstructions) {
          verificationInstructions.textContent = 'Entrez le code OTP reçu par SMS.';
        }
        verificationCodeInput.focus();
      }
      showAlert('Compte créé. Vérifiez votre téléphone avec le code envoyé.');
      setSubmitButtonState(registerSubmitButton, false, 'Créer un compte', 'Création...');
      if (registerSubmitButton) registerSubmitButton.disabled = true;
    } catch (err) {
      console.error('Registration error:', err);
      showAlert('Une erreur réseau est survenue. Veuillez réessayer.');
    } finally {
      if (!pendingUserEmail) {
        isRegisterSubmitting = false;
        setSubmitButtonState(registerSubmitButton, false, 'Créer un compte', 'Création...');
      }
    }
  }

  async function verifyOtp() {
    if (!verificationCodeInput) return;

    const code = verificationCodeInput.value.trim();
    if (!code) {
      showAlert('Veuillez saisir le code reçu.');
      return;
    }

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: pendingUserEmail, otp: code })
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert((data && data.message) ? data.message : (data.error || 'Erreur de vérification.'));
        return;
      }

      window.location.href = '/feed';
    } catch (err) {
      console.error('Verification error:', err);
      showAlert('Une erreur réseau est survenue.');
    }
  }

  async function resendCode() {
    if (!pendingUserEmail) return;

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: pendingUserEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || 'Impossible de renvoyer le code.');
        return;
      }
      showAlert('Un nouveau code a été envoyé.');
    } catch (err) {
      console.error('Resend error:', err);
      showAlert('Une erreur réseau est survenue.');
    }
  }

  async function hydrateVerificationUI() {
    // Pas de canal à déterminer avant inscription/connexion ; on garde le texte par défaut.
    if (verificationInstructions) {
      verificationInstructions.textContent = 'Entrez le code OTP reçu par SMS.';
    }
    if (verifyPhoneButton) {
      verifyPhoneButton.textContent = 'Vérifier le téléphone';
    }
  }


  // Handle Login Form Submission
  if (loginForm) {

    loginForm.addEventListener('submit', handleLoginSubmit);
    loginSubmitButton = loginForm.querySelector('button[type="submit"]');
    if (loginSubmitButton) {
      loginSubmitButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (loginForm.checkValidity()) {
          handleLoginSubmit(event);
        } else {
          loginForm.reportValidity();
        }
      });
    }
  }

  // Handle Register Form Submission
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegisterSubmit);
    registerSubmitButton = registerForm.querySelector('button[type="submit"]');
    if (registerSubmitButton) {
      registerSubmitButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (registerForm.checkValidity()) {
          handleRegisterSubmit(event);
        } else {
          registerForm.reportValidity();
        }
      });
    }
  }

  if (verifyPhoneButton) {
    verifyPhoneButton.addEventListener('click', verifyOtp);
  }

  if (resendCodeButton) {
    resendCodeButton.addEventListener('click', resendCode);
  }

  // Met à jour l’UI avant l’étape OTP (sms/email)
  hydrateVerificationUI();

}

let authInitialized = false;
function ensureAuthInit() {
  if (authInitialized) return;
  authInitialized = true;
  initAuthPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureAuthInit);
} else {
  ensureAuthInit();
}
window.addEventListener('load', ensureAuthInit);


