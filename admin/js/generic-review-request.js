(() => {
  const GENERIC_PATH = "/admin/api/review-requests/generic";

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: { Accept:"application/json", "Content-Type":"application/json" },
      ...options,
    });

    let body;
    try { body = await response.json(); }
    catch { throw new Error(`Unreadable server response (${response.status}).`); }

    if (!response.ok || body?.success !== true) {
      throw new Error(body?.message || `Request failed (${response.status}).`);
    }
    return body;
  }

  function installStyles() {
    if (document.getElementById("genericReviewStyles")) return;
    const style = document.createElement("style");
    style.id = "genericReviewStyles";
    style.textContent = `
      .generic-review-backdrop{position:fixed;inset:0;z-index:320;background:rgba(11,32,47,.42);backdrop-filter:blur(3px)}
      .generic-review-modal{position:fixed;top:50%;left:50%;z-index:330;width:min(560px,calc(100% - 28px));transform:translate(-50%,-50%);border-radius:18px;background:#f7fbfd;box-shadow:0 30px 90px rgba(12,36,53,.3);overflow:hidden}
      .generic-review-modal header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;background:white;border-bottom:1px solid rgba(22,57,87,.12)}
      .generic-review-body{display:grid;gap:14px;padding:20px}
      .generic-review-body label{display:grid;gap:6px}
      .generic-review-body label>span{font-weight:850;color:var(--deep)}
      .generic-review-body input{min-height:42px;padding:9px 11px;border:1px solid rgba(22,57,87,.2);border-radius:10px;background:white;font:inherit}
      .generic-review-result{padding:12px;border-radius:12px;background:#eaf3f8}
      .generic-review-actions{display:flex;flex-wrap:wrap;gap:8px}
      .generic-review-email-status{margin-top:9px;font-size:.88rem;font-weight:800;color:#2d6a52}
    `;
    document.head.appendChild(style);
  }

  function installModal() {
    if (document.getElementById("genericReviewModal")) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div id="genericReviewBackdrop" class="generic-review-backdrop" hidden></div>
      <section id="genericReviewModal" class="generic-review-modal" hidden>
        <header>
          <div><p class="eyebrow">Standalone request</p><h2>Generic Review Link</h2></div>
          <button id="genericReviewClose" class="icon-button" type="button">×</button>
        </header>

        <div class="generic-review-body">
          <label><span>Email address *</span><input id="genericReviewEmail" type="email" autocomplete="email" required></label>
          <label><span>Name</span><input id="genericReviewName" maxlength="200" placeholder="Optional"></label>
          <button id="genericReviewGenerate" class="button button-primary" type="button">Generate Review Link</button>
          <div id="genericReviewResult"></div>
        </div>
      </section>
    `);

    document.getElementById("genericReviewClose")?.addEventListener("click", closeModal);
    document.getElementById("genericReviewBackdrop")?.addEventListener("click", closeModal);
    document.getElementById("genericReviewGenerate")?.addEventListener("click", generate);
  }

  function installButton() {
    const panel = document.querySelector('[data-view-panel="reviews"]');
    const refresh = panel?.querySelector("#reviewRefresh");
    if (!refresh || document.getElementById("genericReviewOpen")) return;

    refresh.insertAdjacentHTML("afterend", `
      <button id="genericReviewOpen" class="button button-primary" type="button">Generic Review Link</button>
    `);

    document.getElementById("genericReviewOpen")?.addEventListener("click", openModal);
  }

  function openModal() {
    document.getElementById("genericReviewModal").hidden = false;
    document.getElementById("genericReviewBackdrop").hidden = false;
    document.getElementById("genericReviewResult").innerHTML = "";
    document.getElementById("genericReviewEmail").focus();
  }

  function closeModal() {
    document.getElementById("genericReviewModal").hidden = true;
    document.getElementById("genericReviewBackdrop").hidden = true;
  }

  async function generate() {
    const email = document.getElementById("genericReviewEmail").value.trim();
    const name = document.getElementById("genericReviewName").value.trim();
    if (!email) { window.alert("Enter an email address."); return; }

    const button = document.getElementById("genericReviewGenerate");
    button.disabled = true;
    button.textContent = "Generating…";

    try {
      const response = await api(GENERIC_PATH, {
        method: "POST",
        body: JSON.stringify({ email, name: name || null }),
      });
      renderResult(response.data?.request);
    } catch (error) {
      window.alert(error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Generate Review Link";
    }
  }

  function renderResult(item) {
    const target = document.getElementById("genericReviewResult");
    if (!target || !item) return;

    target.innerHTML = `
      <div class="generic-review-result">
        <strong>Link ready for ${escapeHtml(item.recipientEmail)}</strong>
        <input id="genericReviewUrl" value="${escapeHtml(item.reviewUrl)}" readonly style="width:100%;margin:8px 0;">

        <div class="generic-review-actions">
          <button id="genericReviewCopy" class="button button-secondary" type="button">Copy Link</button>
          <button id="genericReviewEmailButton" class="button button-primary" type="button">Send Review Email</button>
        </div>

        <div id="genericReviewEmailStatus" class="generic-review-email-status" hidden></div>
      </div>
    `;

    document.getElementById("genericReviewCopy")?.addEventListener("click", () => copyLink(item.reviewUrl));
    document.getElementById("genericReviewEmailButton")?.addEventListener("click", () => sendEmail(item));
  }

  async function copyLink(url) {
    try {
      await navigator.clipboard.writeText(url);
      window.alert("Review link copied.");
    } catch {
      const input = document.getElementById("genericReviewUrl");
      input?.select();
      document.execCommand("copy");
    }
  }

  async function sendEmail(item) {
    const button = document.getElementById("genericReviewEmailButton");
    const status = document.getElementById("genericReviewEmailStatus");
    if (!button) return;

    button.disabled = true;
    button.textContent = "Sending…";
    if (status) { status.hidden = true; status.textContent = ""; }

    try {
      const response = await api(
        `/admin/api/review-requests/generic/${encodeURIComponent(item.id)}/send-email`,
        {
          method: "POST",
          body: JSON.stringify({ reviewUrl: item.reviewUrl }),
        }
      );

      const email = response.data?.email;
      button.textContent = "Email Sent ✓";
      if (status) {
        status.textContent = `Sent to ${email?.sentTo || item.recipientEmail}.`;
        status.hidden = false;
      }
    } catch (error) {
      button.disabled = false;
      button.textContent = "Send Review Email";
      window.alert(error.message);
    }
  }

  function install() {
    installStyles();
    installModal();
    const observer = new MutationObserver(installButton);
    observer.observe(document.body, { childList:true, subtree:true });
    installButton();
  }

  install();
})();