import { DEMO_GUARDIANS, DEMO_PUPILS } from '../data/demo-pupils';
import type { LoginMessages } from '../i18n/login-messages.interface';
import styles from '../styles/Login.module.css';

/** What "Use" fills in: the account's username, and its name for the confirmation. */
export interface DemoChoice {
  name: string;
  username: string;
}

interface DemoAccountsProps {
  text: LoginMessages;
  onUse: (account: DemoChoice) => void;
}

/** Lists the seeded sample pupils and guardian so testers need not remember them; "Use" fills the username but does not sign in. */
export function DemoAccounts({ text, onUse }: DemoAccountsProps) {
  const childName = (username: string) => DEMO_PUPILS.find((pupil) => pupil.username === username)?.name ?? username;
  const rows = [
    ...DEMO_PUPILS.map((pupil) => ({ ...pupil, role: `${text.studentRole} • ${pupil.className}` })),
    ...DEMO_GUARDIANS.map((guardian) => ({ ...guardian, role: text.guardianRole(childName(guardian.childUsername)) })),
  ];
  return (
    <details className={styles.demo} open>
      <summary>{text.demoTitle}</summary>
      <p className={styles.demoIntro}>{text.demoIntro}</p>
      <ul className={styles.demoList}>
        {rows.map((account) => (
          <li key={account.username} className={styles.demoRow}>
            <span className={styles.demoWho}>
              <strong>{account.name}</strong>
              <span className={styles.demoRole}>{account.role}</span>
              <code>{account.username}</code>
            </span>
            <button type="button" className={styles.demoUse} aria-label={text.useAccount(account.name)} onClick={() => onUse(account)}>
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
