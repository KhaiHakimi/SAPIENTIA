import Image from 'next/image';
import type { ReactNode } from 'react';
import type { LoginMessages } from '../i18n/login-messages.interface';
import styles from '../styles/Login.module.css';

function LineIcon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const PILLAR_ICONS: readonly ReactNode[] = [
  <LineIcon key="clock">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </LineIcon>,
  <LineIcon key="scales">
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="M7 21h10" />
    <path d="M12 3v18" />
    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
  </LineIcon>,
  <LineIcon key="file">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </LineIcon>,
];

/** The left column: brand, the product promise and its three pillars. Hidden on narrow screens. */
export function LoginShowcase({ text }: { text: LoginMessages }) {
  return (
    <aside className={styles.showcase} aria-label="Sapientia">
      <div>
        <div className={styles.brandHeader}>
          <span className={styles.badge}>
            <Image src="/brand/sapientia-logo.jpg" alt="" width={62} height={62} priority />
          </span>
          <div className={styles.brandText}>
            <p className={styles.brandName}>SAPIENTIA</p>
            <p className={styles.brandSub}>{text.portalSubtitle}</p>
          </div>
        </div>

        <div className={styles.hero}>
          <h1>{text.panelTitle}</h1>
          <p className={styles.lead}>{text.leadDesc}</p>
          <ul className={styles.pillars}>
            {text.pillars.map((pillar, index) => (
              <li key={pillar.title} className={styles.pillar}>
                <span className={styles.pillarIcon}>{PILLAR_ICONS[index]}</span>
                <span className={styles.pillarBody}>
                  <strong>{pillar.title}</strong>
                  <span>{pillar.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.footerMeta}>
        <span className={styles.metaItem}>
          <LineIcon size={13}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </LineIcon>
          {text.metaPrototype}
        </span>
        <span>{text.metaAffiliation}</span>
      </div>
    </aside>
  );
}
