"use client";

import { Bell, BookOpen, Check, Download, LoaderCircle, Share, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { WorkspacePushPreferences } from "@/lib/workspace-push/model";
import { promptWorkspaceInstall, registerWorkspaceWorker, workspaceInstallPrompt } from "./worker-registration";
import styles from "./workspace-app-settings.module.css";

type Scope = "member" | "cms";
type Language = "de" | "en";
type Copy = readonly [string, string];
type PushStatus = {
  publicKey: string;
  enabled: boolean;
  available: boolean;
  preferences: WorkspacePushPreferences;
  categories: (keyof WorkspacePushPreferences)[];
};
type Device = { ios: boolean; standalone: boolean; canPush: boolean; canInstall: boolean; permission: NotificationPermission | "unsupported" };
type Pending = "install" | "enable" | "disable" | "save" | "test";
type Feedback = { tone: "success" | "error"; message: Copy };

const categories: Record<keyof WorkspacePushPreferences, Copy> = {
  messages: ["Nachrichten", "Messages"],
  schedule: ["Training und Spiele", "Training and matches"],
  news: ["Vereinsnews", "Club news"],
  tactics: ["Taktiken", "Tactics"],
  inquiries: ["Website-Anfragen", "Website inquiries"],
};

function deviceState(): Device {
  const appleNavigator = navigator as Navigator & { standalone?: boolean };
  const ios = /iPhone|iPad|iPod/iu.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const standalone = appleNavigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
  const canPush = window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return {
    ios, standalone, canPush, canInstall: workspaceInstallPrompt(),
    permission: "Notification" in window ? Notification.permission : "unsupported",
  };
}

async function pushRequest(scope: Scope, method: "GET" | "PUT" | "DELETE" | "POST", payload?: object, signal?: AbortSignal) {
  const response = await fetch("/api/workspace-push/" + scope, {
    method, cache: "no-store", credentials: "same-origin", signal,
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!response.ok) throw new Error("Push request failed");
  if (method === "POST") return null;
  const status = await response.json() as PushStatus;
  if (!status || typeof status.enabled !== "boolean" || !status.preferences || !Array.isArray(status.categories)) throw new Error("Invalid push status");
  return status;
}

function applicationServerKey(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), character => character.charCodeAt(0));
}

function matchesKey(subscription: PushSubscription, key: Uint8Array) {
  const stored = subscription.options.applicationServerKey;
  if (!stored) return true;
  const bytes = new Uint8Array(stored);
  return bytes.length === key.length && bytes.every((byte, index) => byte === key[index]);
}

export function WorkspaceAppSettings({ scope, language, onRestartTour }: {
  scope: Scope; language: Language; onRestartTour?: () => void;
}) {
  const t = (de: string, en: string) => language === "de" ? de : en;
  const [device, setDevice] = useState<Device>();
  const [status, setStatus] = useState<PushStatus>();
  const [preferences, setPreferences] = useState<WorkspacePushPreferences>();
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [pending, setPending] = useState<Pending | null>(null);
  const [installFeedback, setInstallFeedback] = useState<Feedback>();
  const [pushFeedback, setPushFeedback] = useState<Feedback>();
  const action = useRef<Pending | null>(null);
  const categoryKeys = status?.categories ?? [];
  const preferenceChanges = Boolean(status && preferences && categoryKeys.some(key => status.preferences[key] !== preferences[key]));

  useEffect(() => {
    const update = () => setDevice(deviceState());
    const displayMode = matchMedia("(display-mode: standalone)");
    update();
    window.addEventListener("workspace:install-available", update);
    window.addEventListener("appinstalled", update);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    displayMode.addEventListener("change", update);
    return () => {
      window.removeEventListener("workspace:install-available", update);
      window.removeEventListener("appinstalled", update);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
      displayMode.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError(false);
    void pushRequest(scope, "GET", undefined, controller.signal).then(result => {
      if (!result || controller.signal.aborted) return;
      setStatus(result);
      setPreferences(result.preferences);
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError(true);
    });
    return () => controller.abort();
  }, [scope, loadAttempt]);

  function start(next: Pending) {
    if (action.current) return false;
    action.current = next;
    setPending(next);
    return true;
  }

  function finish() {
    action.current = null;
    setPending(null);
    setDevice(deviceState());
  }

  async function install() {
    if (!device?.canInstall || !start("install")) return;
    setInstallFeedback(undefined);
    try {
      if (await promptWorkspaceInstall()) {
        setInstallFeedback({ tone: "success", message: ["Du kannst die App über das neue Symbol öffnen.", "Open the app from its new icon."] });
      }
    } catch {
      setInstallFeedback({ tone: "error", message: ["Versuche die Installation über das Browsermenü.", "Try installing from your browser menu."] });
    } finally {
      finish();
    }
  }

  async function enable() {
    if (!device?.canPush || device.ios && !device.standalone || !status?.available || !status.publicKey || !preferences || !start("enable")) return;
    setPushFeedback(undefined);
    let created: PushSubscription | undefined;
    try {
      // The browser permission request must run during the user's tap.
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") {
        setPushFeedback({ tone: "error", message: ["Erlaube Mitteilungen auf diesem Gerät, um sie zu aktivieren.", "Allow notifications on this device to turn them on."] });
        return;
      }
      const worker = await registerWorkspaceWorker(scope);
      if (!worker) throw new Error("No active worker");
      const key = applicationServerKey(status.publicKey);
      let subscription = await worker.pushManager.getSubscription();
      if (subscription && !matchesKey(subscription, key)) {
        await subscription.unsubscribe();
        subscription = null;
      }
      if (!subscription) {
        created = await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        subscription = created;
      }
      const saved = await pushRequest(scope, "PUT", { subscription: subscription.toJSON(), preferences, language });
      if (!saved?.enabled) throw new Error("Push not enabled");
      setStatus(saved);
      setPreferences(saved.preferences);
      setPushFeedback({ tone: "success", message: ["Mitteilungen sind auf diesem Gerät aktiv.", "Notifications are on for this device."] });
    } catch {
      if (created) await created.unsubscribe().catch(() => {});
      setPushFeedback({ tone: "error", message: ["Mitteilungen konnten nicht aktiviert werden. Versuche es erneut.", "Notifications could not be enabled. Try again."] });
    } finally {
      finish();
    }
  }

  async function disable() {
    if (!status?.enabled || !start("disable")) return;
    setPushFeedback(undefined);
    try {
      const disabled = await pushRequest(scope, "DELETE");
      if (!disabled || disabled.enabled) throw new Error("Push is still enabled");
      setStatus(disabled);
      setPreferences(disabled.preferences);
      await registerWorkspaceWorker(scope).then(worker => worker?.pushManager.getSubscription())
        .then(subscription => subscription?.unsubscribe()).catch(() => {});
      setPushFeedback({ tone: "success", message: ["Mitteilungen wurden auf diesem Gerät ausgeschaltet.", "Notifications were turned off for this device."] });
    } catch {
      setPushFeedback({ tone: "error", message: ["Mitteilungen konnten nicht ausgeschaltet werden.", "Notifications could not be turned off."] });
    } finally {
      finish();
    }
  }

  async function savePreferences() {
    if (!status?.enabled || !preferences || !preferenceChanges || !start("save")) return;
    setPushFeedback(undefined);
    try {
      const saved = await pushRequest(scope, "PUT", { preferences, language });
      if (!saved) throw new Error("No push preferences");
      setStatus(saved);
      setPreferences(saved.preferences);
      setPushFeedback({ tone: "success", message: ["Deine Auswahl wurde gespeichert.", "Your preferences were saved."] });
    } catch {
      setPushFeedback({ tone: "error", message: ["Deine Auswahl konnte nicht gespeichert werden.", "Your preferences could not be saved."] });
    } finally {
      finish();
    }
  }

  async function testNotification() {
    if (!status?.enabled || device?.permission !== "granted" || !start("test")) return;
    setPushFeedback(undefined);
    try {
      await pushRequest(scope, "POST");
      setPushFeedback({ tone: "success", message: ["Testmitteilung an dieses Gerät gesendet.", "Test notification sent to this device."] });
    } catch {
      setPushFeedback({ tone: "error", message: ["Die Testmitteilung konnte nicht gesendet werden.", "Could not send the test notification."] });
    } finally {
      finish();
    }
  }

  const requiresInstallation = device?.ios && !device.standalone;
  const blocked = device?.permission === "denied";
  const showEnable = Boolean(status?.available && status.publicKey && device?.canPush && !requiresInstallation && !blocked && !status.enabled);

  return <div className={styles.settings} data-scope={scope} lang={language}>
    <section className={styles.installCard} data-workspace-app-install aria-label={t("App installieren", "Install the app")}>
      <span className={styles.installIcon}><Smartphone size={24} aria-hidden="true" /></span>
      <div className={styles.installContent}>
        <h2>{t("App installieren", "Install the app")}</h2>
        <p>{t("Öffne den Bereich direkt vom Home-Bildschirm oder Startmenü.", "Open this workspace from your home screen or Start menu.")}</p>
        {device?.standalone ? <span className={styles.installed}><Check size={15} aria-hidden="true" />{t("Als App geöffnet", "Running as an app")}</span>
          : device?.ios ? <p className={styles.installHint}><Share size={16} aria-hidden="true" />
            {t("In Safari Teilen → Zum Home-Bildschirm wählen, „Als Web-App öffnen“ aktivieren, falls angezeigt, und über das neue Symbol starten.",
              "In Safari, choose Share → Add to Home Screen, turn on Open as Web App if shown, and launch from the new icon.")}
          </p> : device?.canInstall ? <button className={styles.installButton} type="button" disabled={Boolean(pending)} onClick={() => void install()}>
            <Download size={17} aria-hidden="true" />{t("Installieren", "Install")}
          </button> : device && <p className={styles.installHint}>{t("Die Installationsoption findest du im Browsermenü, wenn dein Browser sie anbietet.", "Look for the install option in your browser menu, if available.")}</p>}
        {installFeedback && <p className={styles.installHint} role={installFeedback.tone === "error" ? "alert" : "status"}>{t(...installFeedback.message)}</p>}
      </div>
    </section>

    <section className={styles.panel} aria-label={t("Mitteilungen", "Notifications")}>
      <header className={styles.panelHeader}>
        <span className={styles.panelIcon}><Bell size={20} aria-hidden="true" /></span>
        <div><h2>{t("Mitteilungen", "Notifications")}</h2><p>{t("Für dieses Gerät", "For this device")}</p></div>
        {status && <span className={styles.status} data-enabled={status.enabled && !blocked || undefined}>
          {blocked ? t("Blockiert", "Blocked") : status.enabled ? t("Aktiv", "On") : t("Aus", "Off")}
        </span>}
      </header>
      {loadError ? <div className={styles.emptyState}>
        <p role="alert">{t("Die Einstellungen konnten nicht geladen werden.", "Could not load your settings.")}</p>
        <button className={styles.secondary} type="button" onClick={() => setLoadAttempt(attempt => attempt + 1)}>{t("Erneut laden", "Try again")}</button>
      </div> : !status ? <p className={styles.info} role="status"><LoaderCircle size={16} className={styles.spinner} aria-hidden="true" />{t("Wird geladen …", "Loading…")}</p>
        : !status.available ? <p className={styles.info}>{t("Mitteilungen sind für deinen Zugang nicht verfügbar.", "Notifications are unavailable for your account.")}</p>
          : !status.publicKey ? <p className={styles.info}>{t("Mitteilungen sind für diesen Bereich noch nicht eingerichtet.", "Notifications have yet to be set up for this workspace.")}</p>
          : requiresInstallation ? <p className={styles.info}>{t("Für Mitteilungen auf iPhone und iPad öffne zuerst die App vom Home-Bildschirm.", "To get notifications on iPhone or iPad, open the app from your Home Screen first.")}</p>
            : device && !device.canPush ? <p className={styles.info}>{t("Dein Browser unterstützt hier keine Web-Mitteilungen.", "Web notifications are unavailable in this browser.")}</p>
              : blocked && <p className={styles.info}>{device?.ios
                ? t("Erlaube Mitteilungen für diese App in den iPhone- oder iPad-Einstellungen.", "Allow this app to send notifications in your iPhone or iPad settings.")
                : t("Erlaube Mitteilungen für diese Website in deinen Browser-Berechtigungen.", "Allow notifications for this site in your browser permissions.")}</p>}
      {preferences && status?.enabled && <fieldset className={styles.categories} disabled={Boolean(pending)}
        aria-label={t("Benachrichtigungskategorien", "Notification categories")}>
        {categoryKeys.map(key => <label className={styles.category} key={key}>
          <span>{t(...categories[key])}</span>
          <input type="checkbox" role="switch" checked={preferences[key]}
            onChange={event => setPreferences({ ...preferences, [key]: event.currentTarget.checked })} />
          <i aria-hidden="true" />
        </label>)}
      </fieldset>}
      {(showEnable || status?.enabled) && <div className={styles.pushActions}>
        {showEnable && <button className={styles.primary} type="button" disabled={Boolean(pending)} onClick={() => void enable()}>
          {pending === "enable" ? t("Wird aktiviert …", "Enabling…") : t("Mitteilungen aktivieren", "Enable notifications")}
        </button>}
        {status?.enabled && <button className={styles.secondary} type="button" disabled={Boolean(pending)} onClick={() => void disable()}>
          {pending === "disable" ? t("Wird ausgeschaltet …", "Turning off…") : t("Ausschalten", "Turn off")}
        </button>}
        {status?.enabled && device?.permission === "granted" && <button className={styles.secondary} type="button" disabled={Boolean(pending)} onClick={() => void testNotification()}>
          {pending === "test" ? t("Wird gesendet …", "Sending…") : t("Testmitteilung senden", "Send test notification")}
        </button>}
        {status?.enabled && preferenceChanges && <button className={styles.primary} type="button" disabled={Boolean(pending)} onClick={() => void savePreferences()}>
          {pending === "save" ? t("Wird gespeichert …", "Saving…") : t("Auswahl speichern", "Save preferences")}
        </button>}
      </div>}
      {pushFeedback && <p className={styles.feedback} data-error={pushFeedback.tone === "error" || undefined} role={pushFeedback.tone === "error" ? "alert" : "status"}>
        {t(...pushFeedback.message)}
      </p>}
    </section>

    {onRestartTour && <section className={styles.helpCard}>
      <span className={styles.panelIcon}><BookOpen size={20} aria-hidden="true" /></span>
      <div><h2>{t("Einführung", "Quick tour")}</h2><p>{t("Lerne die Bereiche und App-Einstellungen kennen.", "Get familiar with the workspace and app settings.")}</p></div>
      <button className={styles.secondary} type="button" onClick={onRestartTour}>{t("Neu starten", "Restart tour")}</button>
    </section>}
  </div>;
}
