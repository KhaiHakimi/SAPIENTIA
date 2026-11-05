'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { promptInstall, useInstallState } from '@/shared/pwa/install-prompt.store';
import type { NotificationsMessages } from '../i18n/notifications-messages.interface';
import { NOTIFICATIONS_MESSAGES } from '../i18n/notifications.messages';
import type { NotificationSettings } from '../interfaces/notification.interface';
import { currentSubscription, disablePush, enablePush, supportsPush } from '../services/push-device.client';
import { fetchNotificationSettings, NOTIFICATION_SETTINGS_KEY, saveEmailChoice } from '../services/notifications.client';

type PushState = 'checking' | 'unsupported' | 'on' | 'off';

function EmailCard({ settings, text }: { settings: NotificationSettings; text: NotificationsMessages }) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: saveEmailChoice,
    onSuccess: (saved) => queryClient.setQueryData(NOTIFICATION_SETTINGS_KEY, saved),
  });
  return (
    <section className={calm.card} aria-labelledby="email-heading">
      <h2 id="email-heading">{text.emailHeading}</h2>
      <label className={calm.checkbox}>
        <input type="checkbox" checked={settings.email} disabled={save.isPending} aria-describedby="email-help"
          onChange={(event) => save.mutate(event.target.checked)} />
        <span>{text.emailLabel}</span>
      </label>
      <p id="email-help" className={calm.help}>{text.emailHelp}</p>
      {save.isError && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(save.error, lang)}</div>}
      {save.isSuccess && <div className={`${calm.alert} ${calm.alertOk}`} role="status">{text.emailSaved(settings.email)}</div>}
    </section>
  );
}

function PushCard({ settings, text }: { settings: NotificationSettings; text: NotificationsMessages }) {
  const install = useInstallState();
  const [state, setState] = useState<PushState>('checking');
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!supportsPush()) return 'unsupported' as const;
      return (await currentSubscription()) ? 'on' as const : 'off' as const;
    };
    check()
      .then((result) => !cancelled && setState(result))
      .catch((error: unknown) => {
        console.error('Could not read the push subscription', error);
        if (!cancelled) setState('off');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const change = async (turnOn: boolean) => {
    setBusy(true);
    setMessage(null);
    try {
      if (!turnOn) {
        await disablePush();
        setState('off');
      } else if (settings.push.publicKey && (await enablePush(settings.push.publicKey)) === 'on') {
        setState('on');
      } else {
        setMessage({ kind: 'info', text: text.pushDenied });
      }
    } catch (error) {
      console.error('Changing push notifications failed', error);
      setMessage({ kind: 'error', text: text.pushFailed });
    } finally {
      setBusy(false);
    }
  };

  let body;
  if (!settings.push.available) body = <p className={calm.muted}>{text.pushNotOffered}</p>;
  else if (state === 'checking') body = <p className={calm.loading} role="status">{text.loading}</p>;
  else if (state === 'unsupported') body = <p className={calm.muted}>{install === 'manual-ios' ? text.pushIosHint : text.pushUnsupported}</p>;
  else {
    body = (
      <div className={calm.row}>
        <p role="status">{busy ? text.pushWorking : state === 'on' ? text.pushOn : text.pushOff}</p>
        <button type="button" className={`${calm.button} ${state === 'on' ? '' : calm.primary}`} disabled={busy}
          onClick={() => void change(state !== 'on')}>
          {state === 'on' ? text.pushTurnOff : text.pushTurnOn}
        </button>
      </div>
    );
  }
  return (
    <section className={calm.card} aria-labelledby="push-heading">
      <h2 id="push-heading">{text.pushHeading}</h2>
      <p className={calm.help}>{text.pushHelp}</p>
      {body}
      {message && (
        <div className={`${calm.alert} ${message.kind === 'error' ? calm.alertError : calm.alertInfo}`} role="alert">{message.text}</div>
      )}
    </section>
  );
}

function InstallCard({ text }: { text: NotificationsMessages }) {
  const install = useInstallState();
  const [busy, setBusy] = useState(false);
  const onInstall = async () => {
    setBusy(true);
    try {
      await promptInstall();
    } catch (error) {
      console.error('Install prompt failed', error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={calm.card} aria-labelledby="install-heading">
      <h2 id="install-heading">{text.installHeading}</h2>
      <p className={calm.help}>{text.installHelp}</p>
      {install === 'installed' && <p role="status">{text.installed}</p>}
      {install === 'available' && (
        <button type="button" className={`${calm.button} ${calm.primary}`} disabled={busy} onClick={() => void onInstall()}>
          {text.installButton}
        </button>
      )}
      {install === 'manual-ios' && <p>{text.installIos}</p>}
      {install === 'unavailable' && <p className={calm.muted}>{text.installUnavailable}</p>}
    </section>
  );
}

/** Every staff member: email on or off, push on this device, and installing the app (plan Sprint 5). */
export function NotificationsPage() {
  const text = useMessages(NOTIFICATIONS_MESSAGES);
  const { lang } = useLanguage();
  const settings = useQuery({ queryKey: NOTIFICATION_SETTINGS_KEY, queryFn: fetchNotificationSettings });
  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
        </div>
      </div>
      {settings.isPending ? (
        <p className={calm.loading} role="status">{text.loading}</p>
      ) : settings.isError ? (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(settings.error, lang)}</div>
      ) : (
        <div className={calm.stack}>
          <EmailCard settings={settings.data} text={text} />
          <PushCard settings={settings.data} text={text} />
          <InstallCard text={text} />
        </div>
      )}
    </>
  );
}
