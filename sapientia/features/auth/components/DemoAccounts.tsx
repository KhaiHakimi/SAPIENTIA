import { DEMO_PUPILS } from '../data/demo-pupils';
import type { DemoPupil } from '../interfaces/account.interface';
import type { LoginMessages } from '../i18n/login-messages.interface';
import styles from '../styles/Login.module.css';

interface DemoAccountsProps {
  text: LoginMessages;
  onUse: (pupil: DemoPupil) => void;
}

/** Lists the seeded sample pupils so testers do not need to remember them; "Use" fills the username but does not sign in. */
export function DemoAccounts({ text, onUse }: DemoAccountsProps) {
  return (
    <details className={styles.demo} open>
      <summary>{text.demoTitle}</summary>
      <p className={styles.demoIntro}>{text.demoIntro}</p>
      <ul className={styles.demoList}>
        {DEMO_PUPILS.map((pupil) => (
          <li key={pupil.username} className={styles.demoRow}>
            <span className={styles.demoWho}>
              <strong>{pupil.name}</strong>
              <span className={styles.demoRole}>
                {text.studentRole} • {pupil.className}
              </span>
              <code>{pupil.username}</code>
            </span>
            <button type="button" className={styles.demoUse} aria-label={text.useAccount(pupil.name)} onClick={() => onUse(pupil)}>
              {text.use}
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.demoIntro}>{text.demoPasswordNote}</p>
      <p className={styles.demoIntro}>{text.staffDemoNote}</p>
    </details>
  );
}
