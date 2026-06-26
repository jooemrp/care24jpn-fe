"use client";

import { useId, useState } from "react";
import { auth } from "@/constants/copy";
import { useLangStore, t } from "@/features/lang/store";
import { useAuth } from "@/context/AuthContext";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

type ActiveTab = "login" | "register";

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { lang } = useLangStore();
  const { login } = useAuth();
  const baseId = useId();

  const [activeTab, setActiveTab] = useState<ActiveTab>("login");

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  if (!open) return null;

  /* Reset transient state and notify the parent to close the modal. */
  function handleClose() {
    setActiveTab("login");
    setLoginUsername("");
    setLoginPassword("");
    setLoginError("");
    setRegisterName("");
    setRegisterEmail("");
    setRegisterPassword("");
    setRegisterConfirmPassword("");
    setRegisterError("");
    setRegisterSuccess(false);
    onClose();
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    await new Promise((r) => setTimeout(r, 600));

    const ok = login(loginUsername.trim(), loginPassword);
    if (ok) {
      handleClose();
    } else {
      setLoginError(t(auth.login.error, lang));
    }
    setLoginLoading(false);
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRegisterError("");

    if (registerPassword !== registerConfirmPassword) {
      setRegisterError(t(auth.register.passwordMismatch, lang));
      return;
    }

    setRegisterLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setRegisterLoading(false);
    setRegisterSuccess(true);
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-heading/40 px-4"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 pt-5">
          <div
            role="tablist"
            aria-label={t(auth.navButton, lang)}
            className="flex gap-2"
          >
            {(["login", "register"] as const).map((tabKey) => {
              const selected = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  id={`${baseId}-tab-${tabKey}`}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel-${tabKey}`}
                  onClick={() => setActiveTab(tabKey)}
                  className={`-mb-px border-b-2 px-3 pb-3 text-sm font-medium transition ${
                    selected
                      ? "border-primary text-primary"
                      : "border-transparent text-body hover:text-primary"
                  }`}
                >
                  {t(auth.tabs[tabKey], lang)}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label={t(auth.close, lang)}
            className="-mt-1 mb-3 text-xl leading-none text-muted transition hover:text-primary"
          >
            ×
          </button>
        </div>

        {activeTab === "login" && (
          <div
            id={`${baseId}-panel-login`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-login`}
            className="px-6 py-6"
          >
            <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
              <div className="space-y-1">
                <label htmlFor={`${baseId}-username`} className="block text-sm font-medium text-body">
                  {t(auth.login.username, lang)}
                </label>
                <input
                  id={`${baseId}-username`}
                  type="text"
                  autoComplete="username"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={`${baseId}-password`} className="block text-sm font-medium text-body">
                  {t(auth.login.password, lang)}
                </label>
                <input
                  id={`${baseId}-password`}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
                />
              </div>

              {loginError && (
                <p className="rounded-xl bg-accent-light px-4 py-2.5 text-xs text-accent">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={loginLoading || !loginUsername || !loginPassword}
                className="w-full rounded-full bg-primary py-3 text-sm font-medium text-white transition hover:bg-primary-mid disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginLoading ? t(auth.login.submitting, lang) : t(auth.login.submit, lang)}
              </button>
            </form>
          </div>
        )}

        {activeTab === "register" && (
          <div
            id={`${baseId}-panel-register`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-register`}
            className="px-6 py-6"
          >
            {registerSuccess ? (
              <p className="rounded-xl bg-primary-light px-4 py-3 text-sm text-heading">
                {t(auth.register.success, lang)}
              </p>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4" noValidate>
                <div className="space-y-1">
                  <label htmlFor={`${baseId}-name`} className="block text-sm font-medium text-body">
                    {t(auth.register.name, lang)}
                  </label>
                  <input
                    id={`${baseId}-name`}
                    type="text"
                    autoComplete="name"
                    required
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${baseId}-email`} className="block text-sm font-medium text-body">
                    {t(auth.register.email, lang)}
                  </label>
                  <input
                    id={`${baseId}-email`}
                    type="email"
                    autoComplete="email"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${baseId}-register-password`} className="block text-sm font-medium text-body">
                    {t(auth.register.password, lang)}
                  </label>
                  <input
                    id={`${baseId}-register-password`}
                    type="password"
                    autoComplete="new-password"
                    required
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${baseId}-confirm-password`} className="block text-sm font-medium text-body">
                    {t(auth.register.confirmPassword, lang)}
                  </label>
                  <input
                    id={`${baseId}-confirm-password`}
                    type="password"
                    autoComplete="new-password"
                    required
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
                  />
                </div>

                {registerError && (
                  <p className="rounded-xl bg-accent-light px-4 py-2.5 text-xs text-accent">
                    {registerError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    registerLoading ||
                    !registerName ||
                    !registerEmail ||
                    !registerPassword ||
                    !registerConfirmPassword
                  }
                  className="w-full rounded-full bg-primary py-3 text-sm font-medium text-white transition hover:bg-primary-mid disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registerLoading ? t(auth.register.submitting, lang) : t(auth.register.submit, lang)}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
