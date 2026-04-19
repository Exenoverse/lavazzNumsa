// login.js — versión integrada y lista para usar
//muoviti
const BACKEND_URL = "https://lavazz-nums.vercel.app";

function el(id) { return document.getElementById(id); }

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function showError(msg) {
  const e = el("login-error");
  if (!e) return;
  e.textContent = msg;
  e.hidden = false;
}

function clearError() {
  const e = el("login-error");
  if (!e) return;
  e.textContent = "";
  e.hidden = true;
}

function setLoading(on) {
  const btn = el("login-button");
  if (!btn) return;
  if (on) {
    btn.disabled = true;
    btn.dataset.origText = btn.textContent;
    btn.textContent = "Caricamento…";
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.origText || "Entra";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = el("login-form");
  const toggle = el("toggle-pin");
  const pin = el("login-pin");
  const nameInput = el("login-name");
  const remember = el("remember");
  const loginButton = el("login-button");

  // Safety: if some elements are missing, keep compatibility with older HTML
  if (!form || !pin || !nameInput || !loginButton) {
    // Fallback: try to wire the simple version (index.html older)
    const simpleBtn = el("login-button");
    if (simpleBtn) simpleBtn.addEventListener("click", tryLoginSimple);
    return;
  }

  // Toggle show/hide PIN
  if (toggle) {
    toggle.addEventListener("click", () => {
      const isPwd = pin.type === "password";
      pin.type = isPwd ? "text" : "password";
      toggle.setAttribute("aria-pressed", String(isPwd));
      toggle.title = isPwd ? "Nascondi PIN" : "Mostra PIN";
      // small visual feedback
      toggle.classList.add("pressed");
      setTimeout(() => toggle.classList.remove("pressed"), 120);
    });
  }

  // Submit handler
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clearError();

    const name = nameInput.value.trim() || "anon";
    const pinVal = pin.value.trim();

    if (!pinVal) {
      showError("Inserisci il PIN.");
      pin.focus();
      return;
    }

    // Optional: require at least 4 digits (adjust as needed)
    if (!/^\d{4,}$/.test(pinVal)) {
      showError("Il PIN deve contenere almeno 4 cifre.");
      pin.focus();
      return;
    }

    setLoading(true);

    try {
      const hash = await sha256(pinVal);

      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash })
      });

      if (!res.ok) {
        // try to read error message from backend
        let json = null;
        try { json = await res.json(); } catch (e) { /* ignore */ }
        showError(json?.error || "PIN non valido.");
        setLoading(false);
        return;
      }

      // Save session info
      localStorage.setItem("caller_name", name);
      localStorage.setItem("access_hash", hash);

      // Remember me
      if (remember && remember.checked) {
        localStorage.setItem("remember_me", "1");
      } else {
        localStorage.removeItem("remember_me");
      }

      // Redirect to app
      window.location.href = "app.html";
    } catch (err) {
      console.error("Login error:", err);
      showError("Errore di rete. Riprova.");
      setLoading(false);
    }
  });

  // Autofill if remembered
  if (localStorage.getItem("remember_me") === "1") {
    const storedName = localStorage.getItem("caller_name");
    if (storedName) nameInput.value = storedName;
  }

  // Accessibility: focus first field
  nameInput.focus();
});

/* ---------- Compatibility fallback for older simple index.html ---------- */

async function tryLoginSimple(ev) {
  // This preserves the original behavior if user still uses the old HTML structure
  ev && ev.preventDefault && ev.preventDefault();

  const nameEl = document.getElementById("login-name");
  const pinEl = document.getElementById("login-pin");
  const errorDiv = document.getElementById("login-error");

  const name = (nameEl && nameEl.value.trim()) || "anon";
  const pin = (pinEl && pinEl.value.trim()) || "";

  if (!pin) {
    if (errorDiv) errorDiv.textContent = "Debes introducir el PIN.";
    return;
  }

  try {
    const hash = await sha256(pin);

    const res = await fetch(`${BACKEND_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hash })
    });

    if (!res.ok) {
      if (errorDiv) errorDiv.textContent = "PIN incorrecto.";
      return;
    }

    localStorage.setItem("caller_name", name);
    localStorage.setItem("access_hash", hash);

    window.location.href = "app.html";
  } catch (err) {
    console.error(err);
    if (errorDiv) errorDiv.textContent = "Error de red.";
  }
}
