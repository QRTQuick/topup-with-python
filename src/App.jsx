import { createContext, useContext, useEffect, useState } from "react";
import {
  HashRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { apiFetch, formatMoney, trackEvent } from "./api";


const AuthContext = createContext(null);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[A-Za-z0-9_]{3,24}$/;


function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </HashRouter>
  );
}


function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("topup-token") || "");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(token));

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setUser(null);
      setAuthLoading(false);
      return undefined;
    }

    setAuthLoading(true);
    apiFetch("/auth/me", { token })
      .then((nextUser) => {
        if (!cancelled) {
          setUser(nextUser);
        }
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem("topup-token");
          setToken("");
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAuthLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const persistSession = (session) => {
    localStorage.setItem("topup-token", session.access_token);
    setToken(session.access_token);
    setUser(session.user);
    setAuthLoading(false);
  };

  const logout = () => {
    localStorage.removeItem("topup-token");
    setToken("");
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) {
      return null;
    }

    const nextUser = await apiFetch("/auth/me", { token });
    setUser(nextUser);
    return nextUser;
  };

  return (
    <AuthContext.Provider value={{ token, user, authLoading, persistSession, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}


function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}


function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <LoadingState label="Checking your account..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


function Shell() {
  const location = useLocation();
  const { user, logout, token } = useAuth();

  useEffect(() => {
    trackEvent(
      {
        event_name: "page_view",
        page: `${location.pathname}${location.search}`,
      },
      token,
    );
  }, [location.pathname, location.search, token]);

  return (
    <div className="app-shell">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">T</span>
          <span>
            <strong>TOPUP with python</strong>
            <small>Let's go pro</small>
          </span>
        </Link>

        <nav className="topnav">
          <NavLink to="/" className={navClassName}>
            Home
          </NavLink>
          <NavLink to="/tutorials" className={navClassName}>
            Tutorials
          </NavLink>
          <NavLink to="/upgrade" className={navClassName}>
            Premium
          </NavLink>
        </nav>

        <div className="topbar-actions">
          {user ? (
            <>
              <span className={`plan-badge ${user.is_premium ? "premium" : "free"}`}>
                {user.is_premium ? "Premium member" : "Free learner"}
              </span>
              <button className="ghost-button" type="button" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navClassName}>
                Login
              </NavLink>
              <Link to="/signup" className="solid-button">
                Join now
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="page-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/tutorials" element={<TutorialsPage />} />
          <Route path="/tutorials/:slug" element={<TutorialDetailPage />} />
          <Route
            path="/upgrade"
            element={
              <ProtectedRoute>
                <UpgradePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout/demo/:reference"
            element={
              <ProtectedRoute>
                <DemoCheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/return"
            element={
              <ProtectedRoute>
                <PaymentReturnPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}


function navClassName({ isActive }) {
  return `nav-link ${isActive ? "active" : ""}`;
}


function HomePage() {
  const { user, token } = useAuth();
  const [summary, setSummary] = useState({
    total_users: 0,
    premium_users: 0,
    payment_attempts: 0,
    successful_payments: 0,
    recorded_events: 0,
  });

  useEffect(() => {
    let cancelled = false;

    apiFetch("/analytics/summary")
      .then((payload) => {
        if (!cancelled) {
          setSummary(payload);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-grid">
      <section className="hero-card">
        <div className="eyebrow">Premium Python Learning Platform</div>
        <h1>Move from Python basics to serious product work in one polished workspace.</h1>
        <p className="hero-copy">
          Learn syntax, APIs, analytics, FastAPI, Pandas, and real payment workflows inside a premium-feel platform
          built for conversion.
        </p>

        <div className="hero-actions">
          <Link to={user ? "/tutorials" : "/signup"} className="solid-button">
            {user ? "Open tutorials" : "Create your account"}
          </Link>
          <Link to={user ? "/upgrade" : "/login"} className="ghost-button">
            Test payments first
          </Link>
        </div>

        <div className="hero-highlights">
          <Highlight title="Free path" value="Basics first" />
          <Highlight title="Premium gate" value="OPay-ready" />
          <Highlight title="Data metrics" value="Tracked over time" />
        </div>
      </section>

      <section className="metrics-panel">
        <div className="section-heading">
          <span>Live platform signals</span>
          <small>What the backend is storing already</small>
        </div>
        <div className="metrics-grid">
          <MetricCard label="Users" value={summary.total_users} />
          <MetricCard label="Premium users" value={summary.premium_users} />
          <MetricCard label="Payment attempts" value={summary.payment_attempts} />
          <MetricCard label="Successful payments" value={summary.successful_payments} />
          <MetricCard label="Events logged" value={summary.recorded_events} />
        </div>
      </section>

      <section className="feature-strip">
        <FeatureCard
          title="Premium UI"
          text="Modern cards, layered gradients, strong typography, and smooth hover details keep the product feeling premium."
        />
        <FeatureCard
          title="Neon-ready auth"
          text="FastAPI, hashed passwords, JWT auth, and a database layer that can point at SQLite now or Neon Postgres later."
        />
        <FeatureCard
          title="Payment-first testing"
          text="Run the premium unlock flow in demo mode today, then switch to live OPay credentials without rebuilding the app."
        />
      </section>

      <section className="cta-band">
        <div>
          <span className="eyebrow">Ready for the first payment test?</span>
          <h2>Register, start a demo checkout, and verify the premium unlock end to end.</h2>
        </div>
        <div className="hero-actions">
          <Link
            to={user ? "/upgrade" : "/signup"}
            className="solid-button"
            onClick={() =>
              trackEvent(
                {
                  event_name: "homepage_cta_clicked",
                  page: "/",
                },
                token,
              )
            }
          >
            Start now
          </Link>
        </div>
      </section>
    </div>
  );
}


function AuthPage({ mode }) {
  const navigate = useNavigate();
  const { persistSession, token } = useAuth();
  const [form, setForm] = useState({
    username: "",
    email: "",
    identifier: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const validate = () => {
    if (isSignup) {
      if (!usernamePattern.test(form.username)) {
        return "Username must be 3 to 24 characters using letters, numbers, or underscores.";
      }
      if (!emailPattern.test(form.email)) {
        return "Please enter a valid email address.";
      }
    }

    if (!form.password || form.password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (!isSignup && !form.identifier.trim()) {
      return "Enter your username or email.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validate();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const session = await apiFetch(isSignup ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: isSignup
          ? {
              username: form.username,
              email: form.email,
              password: form.password,
            }
          : {
              identifier: form.identifier,
              password: form.password,
            },
      });
      persistSession(session);
      await trackEvent(
        {
          event_name: isSignup ? "signup_success" : "login_success",
          page: isSignup ? "/signup" : "/login",
        },
        session.access_token,
      );
      navigate("/tutorials");
    } catch (requestError) {
      setError(requestError.message);
      await trackEvent(
        {
          event_name: isSignup ? "signup_failed" : "login_failed",
          page: isSignup ? "/signup" : "/login",
          properties: { message: requestError.message },
        },
        token,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-copy-card">
        <span className="eyebrow">{isSignup ? "Create premium momentum" : "Welcome back"}</span>
        <h1>{isSignup ? "Open your learning account in under a minute." : "Log in and continue your Python climb."}</h1>
        <p>
          {isSignup
            ? "Your account unlocks progress tracking, payment history, premium upgrades, and a cleaner path from beginner lessons to production-ready Python."
            : "Pick up where you left off, test the payment flow, and unlock the premium library track when you're ready."}
        </p>
      </section>

      <section className="auth-form-card">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <span>{isSignup ? "Start learning" : "Secure login"}</span>
            <small>{isSignup ? "Free account first, premium when you are ready." : "Use your username or email to sign in."}</small>
          </div>

          {isSignup ? (
            <>
              <label className="field">
                <span>Username</span>
                <input name="username" placeholder="topup_builder" value={form.username} onChange={handleChange} />
              </label>
              <label className="field">
                <span>Email</span>
                <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} />
              </label>
            </>
          ) : (
            <label className="field">
              <span>Username or email</span>
              <input name="identifier" placeholder="your username or email" value={form.identifier} onChange={handleChange} />
            </label>
          )}

          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={handleChange}
            />
          </label>

          {error ? <div className="inline-error">{error}</div> : null}

          <button className="solid-button full-width" type="submit" disabled={loading}>
            {loading ? "Working..." : isSignup ? "Create account" : "Login"}
          </button>

          <p className="auth-switch">
            {isSignup ? "Already have an account?" : "Need a new account?"}{" "}
            <Link to={isSignup ? "/login" : "/signup"}>{isSignup ? "Login" : "Register"}</Link>
          </p>
        </form>
      </section>
    </div>
  );
}


function TutorialsPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    apiFetch("/tutorials", { token })
      .then((payload) => {
        if (!cancelled) {
          setSections(payload);
          setError("");
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, user?.is_premium]);

  const handleTutorialClick = async (tutorial) => {
    if (tutorial.is_locked) {
      await trackEvent(
        {
          event_name: "locked_tutorial_clicked",
          page: "/tutorials",
          tutorial_slug: tutorial.slug,
        },
        token,
      );
      navigate(user ? "/upgrade" : "/signup");
      return;
    }

    navigate(`/tutorials/${tutorial.slug}`);
  };

  return (
    <div className="page-grid">
      <section className="hero-card compact">
        <div className="eyebrow">Tutorial library</div>
        <h1>Free foundations first. Premium depth when you’re ready.</h1>
        <p className="hero-copy">
          Basics stay open to everyone, while premium members unlock advanced Python and third-party library tracks.
        </p>

        {!user?.is_premium ? (
          <div className="upgrade-banner">
            <div>
              <strong>Premium unlock</strong>
              <span>Gain access to advanced lessons, framework walkthroughs, and analytics-driven learning content.</span>
            </div>
            <Link to={user ? "/upgrade" : "/signup"} className="solid-button">
              Unlock premium
            </Link>
          </div>
        ) : null}
      </section>

      {loading ? <LoadingState label="Loading tutorials..." /> : null}
      {error ? <InlinePanel title="Unable to load tutorials" text={error} /> : null}

      {!loading
        ? sections.map((section) => (
            <section className="tutorial-section" key={section.name}>
              <div className="section-heading">
                <span>{section.name}</span>
                <small>{section.description}</small>
              </div>
              <div className="card-grid">
                {section.tutorials.map((tutorial) => (
                  <button
                    type="button"
                    className={`tutorial-card ${tutorial.is_locked ? "locked" : ""}`}
                    key={tutorial.slug}
                    onClick={() => handleTutorialClick(tutorial)}
                  >
                    <div className="tutorial-card-top">
                      <span className="mini-badge">{tutorial.level}</span>
                      <span className={`mini-badge ${tutorial.is_premium ? "premium" : "free"}`}>
                        {tutorial.is_premium ? "Premium" : "Free"}
                      </span>
                    </div>
                    <h3>{tutorial.title}</h3>
                    <p>{tutorial.summary}</p>
                    <div className="tag-row">
                      {tutorial.tags.map((tag) => (
                        <span className="tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="tutorial-card-footer">
                      <span>{tutorial.duration}</span>
                      <strong>{tutorial.is_locked ? "Unlock to open" : "Open lesson"}</strong>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))
        : null}
    </div>
  );
}


function TutorialDetailPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { token, user } = useAuth();
  const [tutorial, setTutorial] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    apiFetch(`/tutorials/${slug}`, { token })
      .then(async (payload) => {
        if (!cancelled) {
          setTutorial(payload);
          setError("");
        }
        await trackEvent(
          {
            event_name: "tutorial_opened",
            page: `/tutorials/${slug}`,
            tutorial_slug: slug,
          },
          token,
        );
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, token]);

  if (loading) {
    return <LoadingState label="Loading tutorial..." />;
  }

  if (error) {
    return (
      <InlinePanel
        title="Premium content is still locked"
        text={error}
        actionLabel={user ? "Go to premium" : "Create account"}
        onAction={() => navigate(user ? "/upgrade" : "/signup")}
      />
    );
  }

  if (!tutorial) {
    return <InlinePanel title="Tutorial not found" text="This lesson is missing or unavailable right now." />;
  }

  return (
    <article className="lesson-card">
      <div className="lesson-header">
        <div>
          <span className="eyebrow">{tutorial.section}</span>
          <h1>{tutorial.title}</h1>
          <p>{tutorial.summary}</p>
        </div>
        <div className="lesson-meta">
          <span className="mini-badge">{tutorial.level}</span>
          <span className={`mini-badge ${tutorial.is_premium ? "premium" : "free"}`}>
            {tutorial.is_premium ? "Premium" : "Free"}
          </span>
        </div>
      </div>

      <div className="lesson-body">
        {tutorial.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="lesson-footer">
        <Link to="/tutorials" className="ghost-button">
          Back to library
        </Link>
        {!user?.is_premium ? (
          <Link to={user ? "/upgrade" : "/signup"} className="solid-button">
            Unlock premium path
          </Link>
        ) : null}
      </div>
    </article>
  );
}


function UpgradePage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadPayments = async () => {
    setLoading(true);
    try {
      const payload = await apiFetch("/payments/history", { token });
      setPayments(payload);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [token]);

  const startPayment = async () => {
    setCreating(true);
    setError("");

    try {
      const payload = await apiFetch("/payments/opay/create", {
        method: "POST",
        body: {},
        token,
      });
      await trackEvent(
        {
          event_name: "payment_started",
          page: "/upgrade",
          properties: { mode: payload.mode, reference: payload.payment.reference },
        },
        token,
      );

      if (payload.mode === "demo") {
        navigate(`/checkout/demo/${payload.payment.reference}`);
        return;
      }

      window.location.assign(payload.checkout_url);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-grid">
      <section className="hero-card compact">
        <div className="eyebrow">Premium access</div>
        <h1>Test the payment path that unlocks advanced tutorials.</h1>
        <p className="hero-copy">
          The current flow creates an OPay order. In demo mode, it sends you to a local test checkout so you can verify
          the premium upgrade before switching on live credentials.
        </p>

        <div className="pricing-card">
          <div>
            <span className="mini-label">Current premium access</span>
            <strong>{formatMoney(90000)}</strong>
          </div>
          <div>
            <span className="mini-label">Account status</span>
            <strong>{user?.is_premium ? "Already unlocked" : "Ready to upgrade"}</strong>
          </div>
        </div>

        {user?.is_premium ? (
          <InlinePanel title="Premium already active" text="This account can already access all premium tutorials." />
        ) : (
          <button type="button" className="solid-button" onClick={startPayment} disabled={creating}>
            {creating ? "Preparing checkout..." : "Start payment test"}
          </button>
        )}
      </section>

      <section className="metrics-panel">
        <div className="section-heading">
          <span>Payment history</span>
          <small>Useful while testing callbacks and premium activation.</small>
        </div>

        {loading ? <LoadingState label="Loading payment history..." /> : null}
        {error ? <div className="inline-error">{error}</div> : null}

        {!loading && payments.length === 0 ? (
          <InlinePanel title="No payment attempts yet" text="Start your first test payment to create a history entry here." />
        ) : null}

        <div className="history-list">
          {payments.map((payment) => (
            <div className="history-card" key={payment.reference}>
              <div>
                <strong>{payment.reference}</strong>
                <span>
                  {formatMoney(payment.amount, payment.currency)} • {payment.mode}
                </span>
              </div>
              <span className={`status-pill ${payment.status}`}>{payment.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


function DemoCheckoutPage() {
  const navigate = useNavigate();
  const { reference } = useParams();
  const { token, refreshUser } = useAuth();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState("");

  useEffect(() => {
    let cancelled = false;

    apiFetch(`/payments/${reference}`, { token })
      .then((payload) => {
        if (!cancelled) {
          setPayment(payload);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reference, token]);

  const finishDemoPayment = async (statusValue) => {
    setSubmitting(statusValue);
    setError("");

    try {
      const payload = await apiFetch(`/payments/demo/complete/${reference}?status=${statusValue}`, {
        method: "POST",
        token,
      });
      setPayment(payload);
      await refreshUser();
      await trackEvent(
        {
          event_name: statusValue === "success" ? "payment_demo_success" : "payment_demo_failed",
          page: `/checkout/demo/${reference}`,
          properties: { reference },
        },
        token,
      );
      navigate(`/payment/return?reference=${reference}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting("");
    }
  };

  if (loading) {
    return <LoadingState label="Loading demo checkout..." />;
  }

  if (error || !payment) {
    return <InlinePanel title="Demo checkout unavailable" text={error || "Payment details could not be loaded."} />;
  }

  return (
    <div className="checkout-card">
      <span className="eyebrow">Demo OPay Checkout</span>
      <h1>Simulate the hosted payment page before going live.</h1>
      <p>
        This screen stands in for the OPay cashier while you test the account upgrade and premium unlock flow locally.
      </p>

      <div className="checkout-summary">
        <SummaryRow label="Reference" value={payment.reference} />
        <SummaryRow label="Amount" value={formatMoney(payment.amount, payment.currency)} />
        <SummaryRow label="Mode" value={payment.mode} />
        <SummaryRow label="Status" value={payment.status} />
      </div>

      <div className="hero-actions">
        <button
          type="button"
          className="solid-button"
          disabled={Boolean(submitting)}
          onClick={() => finishDemoPayment("success")}
        >
          {submitting === "success" ? "Confirming..." : "Simulate successful payment"}
        </button>
        <button
          type="button"
          className="ghost-button"
          disabled={Boolean(submitting)}
          onClick={() => finishDemoPayment("failed")}
        >
          {submitting === "failed" ? "Updating..." : "Simulate failed payment"}
        </button>
      </div>
    </div>
  );
}


function PaymentReturnPage() {
  const location = useLocation();
  const { token, refreshUser } = useAuth();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = new URLSearchParams(location.search);
  const reference = params.get("reference");
  const cancelled = params.get("cancelled") === "1";

  useEffect(() => {
    let cancelledRequest = false;

    if (!reference) {
      setError("No payment reference was provided.");
      setLoading(false);
      return undefined;
    }

    const loadPayment = async () => {
      try {
        const payload = await apiFetch(`/payments/${reference}`, { token });
        if (!cancelledRequest) {
          setPayment(payload);
          setError("");
        }
        if (payload.status === "success") {
          await refreshUser();
        }
      } catch (requestError) {
        if (!cancelledRequest) {
          setError(requestError.message);
        }
      } finally {
        if (!cancelledRequest) {
          setLoading(false);
        }
      }
    };

    loadPayment();

    return () => {
      cancelledRequest = true;
    };
  }, [reference, token]);

  if (loading) {
    return <LoadingState label="Checking payment status..." />;
  }

  if (error) {
    return <InlinePanel title="Payment status unavailable" text={error} />;
  }

  return (
    <div className="checkout-card">
      <span className="eyebrow">Payment result</span>
      <h1>
        {cancelled ? "Payment was cancelled." : payment?.status === "success" ? "Premium unlocked successfully." : "Payment still needs attention."}
      </h1>
      <p>
        {payment?.status === "success"
          ? "The backend marked your account as premium, so premium lessons are available immediately."
          : "You can retry the upgrade flow or inspect the payment history while testing callbacks."}
      </p>

      {payment ? (
        <div className="checkout-summary">
          <SummaryRow label="Reference" value={payment.reference} />
          <SummaryRow label="Status" value={payment.status} />
          <SummaryRow label="Amount" value={formatMoney(payment.amount, payment.currency)} />
          <SummaryRow label="Mode" value={payment.mode} />
        </div>
      ) : null}

      <div className="hero-actions">
        <Link to="/tutorials" className="solid-button">
          Open tutorials
        </Link>
        <Link to="/upgrade" className="ghost-button">
          Back to payments
        </Link>
      </div>
    </div>
  );
}


function Highlight({ title, value }) {
  return (
    <div className="highlight-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}


function MetricCard({ label, value }) {
  return (
    <div className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}


function FeatureCard({ title, text }) {
  return (
    <div className="feature-card">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}


function SummaryRow({ label, value }) {
  return (
    <div className="summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


function LoadingState({ label }) {
  return (
    <div className="inline-panel">
      <div className="loader" />
      <span>{label}</span>
    </div>
  );
}


function InlinePanel({ title, text, actionLabel, onAction }) {
  return (
    <div className="inline-panel stacked">
      <strong>{title}</strong>
      <span>{text}</span>
      {actionLabel ? (
        <button type="button" className="solid-button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}


export default App;
