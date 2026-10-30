import { DEMO_ACCOUNTS } from '../data/demo-accounts';
import type { DemoAccount } from '../interfaces/account.interface';
import type { LoginMessages } from '../i18n/login-messages.interface';
import { accountName } from '../services/auth.service';
import styles from '../styles/Login.module.css';

interface DemoAccountsProps {
  text: LoginMessages;
  onUse: (account: DemoAccount) => void;
}

/** Lists the mock student accounts so testers do not need to remember them; "Use" fills the form but does not sign in. */
export function DemoAccounts({ text, onUse }: DemoAccountsProps) {
  return (
    <details className={styles.demo} open>
      <summary>{text.demoTitle}</summary>
      <p className={styles.demoIntro}>{text.demoIntro}</p>
      <ul className={styles.demoList}>
        {DEMO_ACCOUNTS.map((account) => {
          const name = accountName(account);
          return (
            <li key={account.id} className={styles.demoRow}>
              <span className={styles.demoWho}>
                <strong>{name}</strong>
                <span className={styles.demoRole}>
                  {text.studentRole} • {account.student.className}
                </span>
                <code>{account.email}</code>
                <span className={styles.demoPassword}>
                  {text.passwordShort}: <code>{account.password}</code>
                </span>
              </span>
              <button type="button" className={styles.demoUse} aria-label={text.useAccount(name)} onClick={() => onUse(account)}>
                {text.use}
              </button>
            </li>
          );
        })}
      </ul>
      <p className={styles.demoIntro}>{text.staffDemoNote}</p>
    </details>
  );
}
