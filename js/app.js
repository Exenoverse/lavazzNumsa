const BACKEND_URL = "https://lavazz-nums.vercel.app";

let CURRENT_USER = null;
let ACCESS_HASH = null;
let dataBackend = {};

// =========================
// CARICAMENTO DAL BACKEND
// =========================
async function caricaDalBackend() {
    const r = await fetch(`${BACKEND_URL}/api/load`, {
        headers: { "X-Access-Hash": ACCESS_HASH }
    });

    if (!r.ok) {
        alert("Accesso non valido. Ritorno al login.");
        window.location.href = "index.html";
        return;
    }

    const data = await r.json();
    dataBackend = data.payload || {};
}

// =========================
// SALVATAGGIO NEL BACKEND
// =========================
async function salvaNelBackend() {
    fetch(`${BACKEND_URL}/api/save`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Access-Hash": ACCESS_HASH
        },
        body: JSON.stringify({ payload: dataBackend })
    }).catch(err => console.error("Errore durante il salvataggio:", err));
}

// =========================
// CARICAMENTO DELLE CARTE
// =========================
async function loadData() {
    await caricaDalBackend();

    const response = await fetch("resultados.json");
    const data = await response.json();

    const container = document.getElementById("results");
    container.innerHTML = "";

    data.forEach(item => {
        const div = document.createElement("div");
        div.className = "card";

        const id = item.placeId ||
            btoa((item.title + item.address).toLowerCase()).replace(/=/g, "");

        const info = dataBackend[id] || { calls: 0, status: null, history: [] };

        let lastText = "Nessuna modifica registrata";
        if (info.history.length > 0) {
            const last = info.history.at(-1);
            lastText = last.type === "call"
                ? `Ultima chiamata da ${last.by}`
                : `Ultimo stato: ${last.status} da ${last.by}`;
        }

        if (info.status === "convinto") div.classList.add("convencido");
        if (info.status === "rifiutato") div.classList.add("rechazado");

        div.innerHTML = `
            <div class="title">${item.title}</div>
            <div class="address">${item.address}</div>

            <div class="phone" data-phone="${item.phone}" data-id="${id}">
                <span class="phone-icon">📞</span> ${item.phone}
            </div>

            <div class="rating">
                ${item.totalScore ? `${item.totalScore} ⭐ (${item.reviewsCount || 0} recensioni)` : "Nessuna valutazione"}
            </div>

            <div class="calls">Chiamate: ${info.calls}</div>

            <div class="history">${lastText}</div>
        `;

        div.querySelector(".phone").onclick = () => openMenu(item.phone, id, div);

        container.appendChild(div);
    });
}

// =========================
// POPUP
// =========================
function openMenu(phone, id, element) {
    closeExistingMenus();

    const menu = document.createElement("div");
    menu.className = "popup-menu";

    menu.innerHTML = `
        <button onclick="callNumber('${phone}', '${id}')">📞 Chiama</button>
        <button onclick="markStatus('${id}', 'convinto')">✔️ Convinto</button>
        <button onclick="markStatus('${id}', 'rifiutato')">❌ Rifiutato</button>
    `;

    document.body.appendChild(menu);

    const rect = element.getBoundingClientRect();
    menu.style.top = rect.bottom + "px";
    menu.style.left = rect.left + "px";

    setTimeout(() => {
        document.addEventListener("click", closeExistingMenus, { once: true });
    }, 100);
}

function closeExistingMenus() {
    document.querySelectorAll(".popup-menu").forEach(m => m.remove());
}

// =========================
// CHIAMATA
// =========================
async function callNumber(phone, id) {
    closeExistingMenus();

    if (!dataBackend[id]) {
        dataBackend[id] = { calls: 0, status: null, history: [] };
    }

    dataBackend[id].calls++;
    dataBackend[id].history.push({
        type: "call",
        by: CURRENT_USER,
        at: new Date().toISOString()
    });

    updateCardUI(id);
    salvaNelBackend();

    window.location.href = `tel:${phone}`;
}

// =========================
// CAMBIARE STATO
// =========================
async function markStatus(id, status) {
    closeExistingMenus();

    if (!dataBackend[id]) {
        dataBackend[id] = { calls: 0, status: null, history: [] };
    }

    dataBackend[id].status = status;
    dataBackend[id].history.push({
        type: "status",
        status,
        by: CURRENT_USER,
        at: new Date().toISOString()
    });

    updateCardUI(id);
    salvaNelBackend();
}

// =========================
// AGGIORNARE SOLO UNA CARTA
// =========================
function updateCardUI(id) {
    const phoneEl = document.querySelector(`.phone[data-id="${id}"]`);
    if (!phoneEl) return;

    const card = phoneEl.closest(".card");
    const info = dataBackend[id];

    card.querySelector(".history").textContent =
        info.history.length > 0
            ? (info.history.at(-1).type === "call"
                ? `Ultima chiamata da ${info.history.at(-1).by}`
                : `Ultimo stato: ${info.history.at(-1).status} da ${info.history.at(-1).by}`)
            : "Nessuna modifica registrata";

    card.querySelector(".calls").textContent = `Chiamate: ${info.calls}`;

    card.classList.remove("convencido", "rechazado");
    if (info.status === "convinto") card.classList.add("convencido");
    if (info.status === "rifiutato") card.classList.add("rechazado");
}

// =========================
// RICERCA IN TEMPO REALE
// =========================
document.addEventListener("DOMContentLoaded", () => {
    const search = document.getElementById("search");
    if (!search) return;

    search.addEventListener("input", function () {
        const term = this.value.toLowerCase().trim();
        const cards = document.querySelectorAll(".card");

        cards.forEach(card => {
            const title = card.querySelector(".title")?.textContent.toLowerCase() || "";
            const address = card.querySelector(".address")?.textContent.toLowerCase() || "";
            const phone = card.querySelector(".phone")?.textContent.toLowerCase() || "";

            const match =
                title.includes(term) ||
                address.includes(term) ||
                phone.includes(term);

            card.style.display = match ? "block" : "none";
        });
    });
});

// =========================
// INIZIALIZZAZIONE
// =========================
(function init() {
    CURRENT_USER = localStorage.getItem("caller_name");
    ACCESS_HASH = localStorage.getItem("access_hash");

    if (!CURRENT_USER || !ACCESS_HASH) {
        window.location.href = "index.html";
        return;
    }

    loadData();
})();
