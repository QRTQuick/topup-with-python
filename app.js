const LOCAL_API_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "topup-token";
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,24}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PREMIUM_PRICE_MINOR = 90000;

const state = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  user: null,
  page: document.body.dataset.page || "home",
};

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  state.user = await loadCurrentUser();
  renderHeader();
  trackEvent({
    event_name: "page_view",
    page: currentPagePath(),
  });

  switch (state.page) {
    case "home":
      renderHomePage();
      await hydrateHomeMetrics();
      break;
    case "login":
      renderAuthPage("login");
      break;
    case "signup":
      renderAuthPage("signup");
      break;
    case "tutorials":
      await renderTutorialsPage();
      break;
    case "tutorial-detail":
      await renderTutorialDetailPage();
      break;
    case "premium":
      await renderPremiumPage();
      break;
    case "demo-checkout":
      await renderDemoCheckoutPage();
      break;
    case "payment-return":
      await renderPaymentReturnPage();
      break;
    default:
      renderInlinePanel("Page unavailable", "This page is not configured yet.");
  }
}

function resolveApiUrl() {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return LOCAL_API_URL;
  }
  return "/api";
}

function currentPagePath() {
  return `${window.location.pathname}${window.location.search}`;
}

function getNextTarget() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next || "tutorials.html";
}

function navigateTo(path) {
  window.location.href = path;
}

function requireAuth() {
  if (!state.user) {
    navigateTo(`login.html?next=${encodeURIComponent(currentPagePath())}`);
    return false;
  }
  return true;
}

function saveSession(session) {
  localStorage.setItem(TOKEN_KEY, session.access_token);
  state.token = session.access_token;
  state.user = session.user;
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  state.token = "";
  state.user = null;
}

async function loadCurrentUser() {
  if (!state.token) {
    return null;
  }

  try {
    return await apiFetch("/auth/me", { token: state.token });
  } catch {
    clearSession();
    return null;
  }
}

async function refreshCurrentUser() {
  state.user = await loadCurrentUser();
  renderHeader();
  return state.user;
}

function renderHeader() {
  const header = document.getElementById("site-header");
  if (!header) {
    return;
  }

  const active = (name) => (state.page === name ? "active" : "");

  header.innerHTML = `
    <a href="index.html" class="brand">
      <span class="brand-mark">T</span>
      <span>
        <strong>TOPUP with python</strong>
        <small>Let's go pro</small>
      </span>
    </a>

    <nav class="topnav">
      <a href="index.html" class="nav-link ${active("home")}">Home</a>
      <a href="tutorials.html" class="nav-link ${active("tutorials") || active("tutorial-detail")}">Tutorials</a>
      <a href="premium.html" class="nav-link ${active("premium")}">Premium</a>
    </nav>

    <div class="topbar-actions">
      ${
        state.user
          ? `
            <span class="plan-badge ${state.user.is_premium ? "premium" : "free"}">
              ${state.user.is_premium ? "Premium member" : "Free learner"}
            </span>
            <button class="ghost-button" type="button" id="logout-button">Logout</button>
          `
          : `
            <a href="login.html" class="nav-link ${active("login")}">Login</a>
            <a href="signup.html" class="solid-button">Join now</a>
          `
      }
    </div>
  `;

  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      clearSession();
      renderHeader();
      navigateTo("index.html");
    });
  }
}

function setPageContent(html) {
  const pageContent = document.getElementById("page-content");
  if (pageContent) {
    pageContent.innerHTML = html;
  }
}

function renderLoading(label) {
  return `
    <div class="inline-panel">
      <div class="loader"></div>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function renderInlinePanel(title, text, action) {
  const actionMarkup = action
    ? `<div class="button-row"><a class="${action.kind || "solid-button"}" href="${action.href}">${escapeHtml(action.label)}</a></div>`
    : "";

  setPageContent(`
    <div class="inline-panel stacked">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(text)}</span>
      ${actionMarkup}
    </div>
  `);
}

function renderHomePage() {
  const primaryHref = state.user ? "tutorials.html" : "signup.html";
  const secondaryHref = state.user ? "premium.html" : "login.html";

  setPageContent(`
    <section class="hero-card">
      <div class="eyebrow">Premium Python Learning Platform</div>
      <h1>Move from Python basics to serious product work in one polished workspace.</h1>
      <p class="hero-copy">
        Learn syntax, APIs, analytics, FastAPI, Pandas, and real payment workflows inside a premium-feel platform
        built for conversion.
      </p>

      <div class="hero-actions">
        <a href="${primaryHref}" class="solid-button">${state.user ? "Open tutorials" : "Create your account"}</a>
        <a href="${secondaryHref}" class="ghost-button">Test payments first</a>
      </div>

      <div class="hero-highlights">
        <div class="highlight-card">
          <span>Free path</span>
          <strong>Basics first</strong>
        </div>
        <div class="highlight-card">
          <span>Premium gate</span>
          <strong>OPay-ready</strong>
        </div>
        <div class="highlight-card">
          <span>Data metrics</span>
          <strong>Tracked over time</strong>
        </div>
      </div>
    </section>

    <section class="metrics-panel">
      <div class="section-heading">
        <span>Live platform signals</span>
        <small>What the backend is storing already</small>
      </div>
      <div class="metrics-grid">
        <div class="metric-card"><strong data-metric="users">0</strong><span>Users</span></div>
        <div class="metric-card"><strong data-metric="premium-users">0</strong><span>Premium users</span></div>
        <div class="metric-card"><strong data-metric="payment-attempts">0</strong><span>Payment attempts</span></div>
        <div class="metric-card"><strong data-metric="successful-payments">0</strong><span>Successful payments</span></div>
        <div class="metric-card"><strong data-metric="recorded-events">0</strong><span>Events logged</span></div>
      </div>
    </section>

    <section class="feature-strip">
      <div class="feature-card">
        <h3>Premium UI</h3>
        <p>Modern cards, layered gradients, strong typography, and smooth hover details keep the product feeling premium.</p>
      </div>
      <div class="feature-card">
        <h3>Neon-ready auth</h3>
        <p>FastAPI, hashed passwords, JWT auth, and a database layer that can point at SQLite now or Neon Postgres later.</p>
      </div>
      <div class="feature-card">
        <h3>Payment-first testing</h3>
        <p>Run the premium unlock flow in demo mode today, then switch to live OPay credentials without rebuilding the app.</p>
      </div>
    </section>

    <section class="cta-band">
      <div>
        <span class="eyebrow">Ready for the first payment test?</span>
        <h2>Register, start a demo checkout, and verify the premium unlock end to end.</h2>
      </div>
      <div class="hero-actions">
        <a href="${state.user ? "premium.html" : "signup.html"}" class="solid-button" id="homepage-cta">Start now</a>
      </div>
    </section>
  `);

  const cta = document.getElementById("homepage-cta");
  if (cta) {
    cta.addEventListener("click", () => {
      trackEvent({
        event_name: "homepage_cta_clicked",
        page: currentPagePath(),
      });
    });
  }
}

async function hydrateHomeMetrics() {
  try {
    const summary = await apiFetch("/analytics/summary");
    setMetric("users", summary.total_users);
    setMetric("premium-users", summary.premium_users);
    setMetric("payment-attempts", summary.payment_attempts);
    setMetric("successful-payments", summary.successful_payments);
    setMetric("recorded-events", summary.recorded_events);
  } catch {
    // Keep the landing page stable if the backend is offline.
  }
}

function setMetric(key, value) {
  const target = document.querySelector(`[data-metric="${key}"]`);
  if (target) {
    target.textContent = String(value);
  }
}

function renderAuthPage(mode) {
  if (state.user) {
    navigateTo(getNextTarget());
    return;
  }

  const isSignup = mode === "signup";
  setPageContent(`
    <div class="auth-layout">
      <section class="auth-copy-card">
        <span class="eyebrow">${isSignup ? "Create premium momentum" : "Welcome back"}</span>
        <h1>${isSignup ? "Open your learning account in under a minute." : "Log in and continue your Python climb."}</h1>
        <p>
          ${
            isSignup
              ? "Your account unlocks progress tracking, payment history, premium upgrades, and a cleaner path from beginner lessons to production-ready Python."
              : "Pick up where you left off, test the payment flow, and unlock the premium library track when you're ready."
          }
        </p>
      </section>

      <section class="auth-form-card">
        <form class="auth-form" id="auth-form">
          <div class="section-heading">
            <span>${isSignup ? "Start learning" : "Secure login"}</span>
            <small>${isSignup ? "Free account first, premium when you are ready." : "Use your username or email to sign in."}</small>
          </div>

          ${
            isSignup
              ? `
                <label class="field">
                  <span>Username</span>
                  <input name="username" placeholder="topup_builder" />
                </label>
                <label class="field">
                  <span>Email</span>
                  <input name="email" type="email" placeholder="you@example.com" />
                </label>
              `
              : `
                <label class="field">
                  <span>Username or email</span>
                  <input name="identifier" placeholder="your username or email" />
                </label>
              `
          }

          <label class="field">
            <span>Password</span>
            <input name="password" type="password" placeholder="At least 8 characters" />
          </label>

          <div class="inline-error hidden" id="auth-error"></div>

          <button class="solid-button full-width" type="submit" id="auth-submit">${isSignup ? "Create account" : "Login"}</button>

          <p class="auth-switch">
            ${isSignup ? "Already have an account?" : "Need a new account?"}
            <a href="${isSignup ? "login.html" : "signup.html"}">${isSignup ? "Login" : "Register"}</a>
          </p>
        </form>
      </section>
    </div>
  `);

  const form = document.getElementById("auth-form");
  const submitButton = document.getElementById("auth-submit");
  const errorBox = document.getElementById("auth-error");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.classList.add("hidden");
    errorBox.textContent = "";

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const validationMessage = validateAuthPayload(mode, payload);

    if (validationMessage) {
      errorBox.textContent = validationMessage;
      errorBox.classList.remove("hidden");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Working...";

    try {
      const session = await apiFetch(isSignup ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: isSignup
          ? {
              username: payload.username.trim(),
              email: payload.email.trim(),
              password: payload.password,
            }
          : {
              identifier: payload.identifier.trim(),
              password: payload.password,
            },
      });
      saveSession(session);
      renderHeader();
      await trackEvent({
        event_name: isSignup ? "signup_success" : "login_success",
        page: currentPagePath(),
      });
      navigateTo(getNextTarget());
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.remove("hidden");
      trackEvent({
        event_name: isSignup ? "signup_failed" : "login_failed",
        page: currentPagePath(),
        properties: { message: error.message },
      });
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = isSignup ? "Create account" : "Login";
    }
  });
}

function validateAuthPayload(mode, payload) {
  if (mode === "signup") {
    if (!USERNAME_PATTERN.test(payload.username || "")) {
      return "Username must be 3 to 24 characters using letters, numbers, or underscores.";
    }
    if (!EMAIL_PATTERN.test(payload.email || "")) {
      return "Please enter a valid email address.";
    }
  } else if (!(payload.identifier || "").trim()) {
    return "Enter your username or email.";
  }

  if (!(payload.password || "").trim() || payload.password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return "";
}

async function renderTutorialsPage() {
  setPageContent(`
    <section class="hero-card compact">
      <div class="eyebrow">Tutorial library</div>
      <h1>Free foundations first. Premium depth when you’re ready.</h1>
      <p class="hero-copy">
        Basics stay open to everyone, while premium members unlock advanced Python and third-party library tracks.
      </p>
      ${
        state.user && !state.user.is_premium
          ? `
            <div class="upgrade-banner">
              <div>
                <strong>Premium unlock</strong>
                <span>Gain access to advanced lessons, framework walkthroughs, and analytics-driven learning content.</span>
              </div>
              <a href="premium.html" class="solid-button">Unlock premium</a>
            </div>
          `
          : !state.user
            ? `
              <div class="upgrade-banner">
                <div>
                  <strong>Free content is open now</strong>
                  <span>Create an account to save your place and test the premium payment flow.</span>
                </div>
                <a href="signup.html?next=${encodeURIComponent("tutorials.html")}" class="solid-button">Create account</a>
              </div>
            `
            : ""
      }
    </section>
    <div id="tutorial-sections">${renderLoading("Loading tutorials...")}</div>
  `);

  try {
    const sections = await apiFetch("/tutorials", {
      token: state.token,
    });

    const sectionsMarkup = sections
      .map(
        (section) => `
          <section class="tutorial-section">
            <div class="section-heading">
              <span>${escapeHtml(section.name)}</span>
              <small>${escapeHtml(section.description)}</small>
            </div>
            <div class="card-grid">
              ${section.tutorials
                .map(
                  (tutorial) => `
                    <button
                      type="button"
                      class="tutorial-card ${tutorial.is_locked ? "locked" : ""}"
                      data-tutorial-slug="${escapeHtml(tutorial.slug)}"
                      data-tutorial-locked="${tutorial.is_locked ? "1" : "0"}"
                    >
                      <div class="tutorial-card-top">
                        <span class="mini-badge">${escapeHtml(tutorial.level)}</span>
                        <span class="mini-badge ${tutorial.is_premium ? "premium" : "free"}">
                          ${tutorial.is_premium ? "Premium" : "Free"}
                        </span>
                      </div>
                      <h3>${escapeHtml(tutorial.title)}</h3>
                      <p>${escapeHtml(tutorial.summary)}</p>
                      <div class="tag-row">
                        ${tutorial.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
                      </div>
                      <div class="tutorial-card-footer">
                        <span>${escapeHtml(tutorial.duration)}</span>
                        <strong>${tutorial.is_locked ? "Unlock to open" : "Open lesson"}</strong>
                      </div>
                    </button>
                  `,
                )
                .join("")}
            </div>
          </section>
        `,
      )
      .join("");

    const tutorialSections = document.getElementById("tutorial-sections");
    tutorialSections.innerHTML = sectionsMarkup;

    tutorialSections.querySelectorAll("[data-tutorial-slug]").forEach((button) => {
      button.addEventListener("click", async () => {
        const slug = button.getAttribute("data-tutorial-slug");
        const locked = button.getAttribute("data-tutorial-locked") === "1";

        if (locked) {
          await trackEvent({
            event_name: "locked_tutorial_clicked",
            page: currentPagePath(),
            tutorial_slug: slug,
          });
          navigateTo(state.user ? "premium.html" : "signup.html?next=tutorials.html");
          return;
        }

        navigateTo(`tutorial.html?slug=${encodeURIComponent(slug)}`);
      });
    });
  } catch (error) {
    renderInlinePanel("Unable to load tutorials", error.message);
  }
}

async function renderTutorialDetailPage() {
  const slug = new URLSearchParams(window.location.search).get("slug");

  if (!slug) {
    renderInlinePanel("Tutorial not found", "No tutorial slug was provided.", {
      href: "tutorials.html",
      label: "Back to tutorials",
    });
    return;
  }

  setPageContent(renderLoading("Loading tutorial..."));

  try {
    const tutorial = await apiFetch(`/tutorials/${encodeURIComponent(slug)}`, {
      token: state.token,
    });

    setPageContent(`
      <article class="lesson-card">
        <div class="lesson-header">
          <div>
            <span class="eyebrow">${escapeHtml(tutorial.section)}</span>
            <h1>${escapeHtml(tutorial.title)}</h1>
            <p>${escapeHtml(tutorial.summary)}</p>
          </div>
          <div class="lesson-meta">
            <span class="mini-badge">${escapeHtml(tutorial.level)}</span>
            <span class="mini-badge ${tutorial.is_premium ? "premium" : "free"}">${tutorial.is_premium ? "Premium" : "Free"}</span>
          </div>
        </div>

        <div class="lesson-body">
          ${tutorial.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        </div>

        <div class="lesson-footer">
          <a href="tutorials.html" class="ghost-button">Back to library</a>
          ${
            !state.user || !state.user.is_premium
              ? `<a href="${state.user ? "premium.html" : "signup.html?next=tutorials.html"}" class="solid-button">Unlock premium path</a>`
              : ""
          }
        </div>
      </article>
    `);

    trackEvent({
      event_name: "tutorial_opened",
      page: currentPagePath(),
      tutorial_slug: slug,
    });
  } catch (error) {
    renderInlinePanel("Premium content is still locked", error.message, {
      href: state.user ? "premium.html" : "signup.html?next=tutorials.html",
      label: state.user ? "Go to premium" : "Create account",
    });
  }
}

async function renderPremiumPage() {
  if (!requireAuth()) {
    return;
  }

  setPageContent(`
    <section class="hero-card compact">
      <div class="eyebrow">Premium access</div>
      <h1>Test the payment path that unlocks advanced tutorials.</h1>
      <p class="hero-copy">
        The current flow creates an OPay order. In demo mode, it sends you to a local test checkout so you can verify
        the premium upgrade before switching on live credentials.
      </p>

      <div class="pricing-card">
        <div>
          <span class="mini-label">Current premium access</span>
          <strong>${formatMoney(PREMIUM_PRICE_MINOR)}</strong>
        </div>
        <div>
          <span class="mini-label">Account status</span>
          <strong>${state.user.is_premium ? "Already unlocked" : "Ready to upgrade"}</strong>
        </div>
      </div>

      ${
        state.user.is_premium
          ? `
            <div class="inline-panel stacked">
              <strong>Premium already active</strong>
              <span>This account can already access all premium tutorials.</span>
            </div>
          `
          : `<button type="button" class="solid-button" id="start-payment-button">Start payment test</button>`
      }
    </section>

    <section class="metrics-panel">
      <div class="section-heading">
        <span>Payment history</span>
        <small>Useful while testing callbacks and premium activation.</small>
      </div>
      <div id="payment-history">${renderLoading("Loading payment history...")}</div>
    </section>
  `);

  if (!state.user.is_premium) {
    const startButton = document.getElementById("start-payment-button");
    startButton.addEventListener("click", async () => {
      startButton.disabled = true;
      startButton.textContent = "Preparing checkout...";

      try {
        const payload = await apiFetch("/payments/opay/create", {
          method: "POST",
          body: {},
          token: state.token,
        });

        await trackEvent({
          event_name: "payment_started",
          page: currentPagePath(),
          properties: {
            mode: payload.mode,
            reference: payload.payment.reference,
          },
        });

        window.location.href = payload.checkout_url;
      } catch (error) {
        startButton.disabled = false;
        startButton.textContent = "Start payment test";
        const history = document.getElementById("payment-history");
        history.insertAdjacentHTML(
          "beforebegin",
          `<div class="inline-error">${escapeHtml(error.message)}</div>`,
        );
      }
    });
  }

  await hydratePaymentHistory();
}

async function hydratePaymentHistory() {
  const target = document.getElementById("payment-history");
  if (!target) {
    return;
  }

  try {
    const payments = await apiFetch("/payments/history", {
      token: state.token,
    });

    if (!payments.length) {
      target.innerHTML = `
        <div class="empty-state">
          <strong>No payment attempts yet</strong>
          <span class="subtle-text">Start your first test payment to create a history entry here.</span>
        </div>
      `;
      return;
    }

    target.innerHTML = `
      <div class="history-list">
        ${payments
          .map(
            (payment) => `
              <div class="history-card">
                <div>
                  <strong>${escapeHtml(payment.reference)}</strong>
                  <span>${formatMoney(payment.amount, payment.currency)} • ${escapeHtml(payment.mode)}</span>
                </div>
                <span class="status-pill ${escapeHtml(payment.status)}">${escapeHtml(payment.status)}</span>
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  } catch (error) {
    target.innerHTML = `<div class="inline-error">${escapeHtml(error.message)}</div>`;
  }
}

async function renderDemoCheckoutPage() {
  if (!requireAuth()) {
    return;
  }

  const reference = new URLSearchParams(window.location.search).get("reference");
  if (!reference) {
    renderInlinePanel("Demo checkout unavailable", "No payment reference was provided.", {
      href: "premium.html",
      label: "Back to premium",
    });
    return;
  }

  setPageContent(renderLoading("Loading demo checkout..."));

  try {
    const payment = await apiFetch(`/payments/${encodeURIComponent(reference)}`, {
      token: state.token,
    });

    setPageContent(`
      <div class="checkout-card">
        <span class="eyebrow">Demo OPay Checkout</span>
        <h1>Simulate the hosted payment page before going live.</h1>
        <p>This screen stands in for the OPay cashier while you test the account upgrade and premium unlock flow locally.</p>

        <div class="checkout-summary">
          ${summaryRow("Reference", payment.reference)}
          ${summaryRow("Amount", formatMoney(payment.amount, payment.currency))}
          ${summaryRow("Mode", payment.mode)}
          ${summaryRow("Status", payment.status)}
        </div>

        <div class="hero-actions">
          <button type="button" class="solid-button" id="demo-success-button">Simulate successful payment</button>
          <button type="button" class="ghost-button" id="demo-failed-button">Simulate failed payment</button>
        </div>
      </div>
    `);

    document.getElementById("demo-success-button").addEventListener("click", () => finishDemoPayment(reference, "success"));
    document.getElementById("demo-failed-button").addEventListener("click", () => finishDemoPayment(reference, "failed"));
  } catch (error) {
    renderInlinePanel("Demo checkout unavailable", error.message, {
      href: "premium.html",
      label: "Back to premium",
    });
  }
}

async function finishDemoPayment(reference, status) {
  const successButton = document.getElementById("demo-success-button");
  const failedButton = document.getElementById("demo-failed-button");

  if (successButton) {
    successButton.disabled = true;
    successButton.textContent = status === "success" ? "Confirming..." : "Simulate successful payment";
  }
  if (failedButton) {
    failedButton.disabled = true;
    failedButton.textContent = status === "failed" ? "Updating..." : "Simulate failed payment";
  }

  try {
    await apiFetch(`/payments/demo/complete/${encodeURIComponent(reference)}?status=${encodeURIComponent(status)}`, {
      method: "POST",
      token: state.token,
    });

    await refreshCurrentUser();
    await trackEvent({
      event_name: status === "success" ? "payment_demo_success" : "payment_demo_failed",
      page: currentPagePath(),
      properties: { reference },
    });
    navigateTo(`payment-return.html?reference=${encodeURIComponent(reference)}`);
  } catch (error) {
    renderInlinePanel("Unable to finish demo payment", error.message, {
      href: `demo-checkout.html?reference=${encodeURIComponent(reference)}`,
      label: "Try again",
    });
  }
}

async function renderPaymentReturnPage() {
  if (!requireAuth()) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const reference = params.get("reference");
  const cancelled = params.get("cancelled") === "1";

  if (!reference) {
    renderInlinePanel("Payment status unavailable", "No payment reference was provided.", {
      href: "premium.html",
      label: "Back to premium",
    });
    return;
  }

  setPageContent(renderLoading("Checking payment status..."));

  try {
    const payment = await apiFetch(`/payments/${encodeURIComponent(reference)}`, {
      token: state.token,
    });

    if (payment.status === "success") {
      await refreshCurrentUser();
    }

    setPageContent(`
      <div class="checkout-card">
        <span class="eyebrow">Payment result</span>
        <h1>${escapeHtml(cancelled ? "Payment was cancelled." : payment.status === "success" ? "Premium unlocked successfully." : "Payment still needs attention.")}</h1>
        <p>
          ${
            payment.status === "success"
              ? "The backend marked your account as premium, so premium lessons are available immediately."
              : "You can retry the upgrade flow or inspect the payment history while testing callbacks."
          }
        </p>

        <div class="checkout-summary">
          ${summaryRow("Reference", payment.reference)}
          ${summaryRow("Status", payment.status)}
          ${summaryRow("Amount", formatMoney(payment.amount, payment.currency))}
          ${summaryRow("Mode", payment.mode)}
        </div>

        <div class="hero-actions">
          <a href="tutorials.html" class="solid-button">Open tutorials</a>
          <a href="premium.html" class="ghost-button">Back to payments</a>
        </div>
      </div>
    `);
  } catch (error) {
    renderInlinePanel("Payment status unavailable", error.message, {
      href: "premium.html",
      label: "Back to premium",
    });
  }
}

function summaryRow(label, value) {
  return `
    <div class="summary-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `;
}

function formatMoney(minorAmount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format((Number(minorAmount) || 0) / 100);
}

async function apiFetch(path, options = {}) {
  const apiUrl = resolveApiUrl();
  const method = options.method || "GET";
  const headers = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.message || "Request failed.");
  }

  return payload;
}

async function trackEvent(event) {
  try {
    await apiFetch("/analytics/events", {
      method: "POST",
      body: event,
      token: state.token,
    });
  } catch {
    // Analytics should never block the main product flow.
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
