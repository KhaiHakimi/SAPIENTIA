import Image from 'next/image';
import styles from '../../styles/Sidebar.module.css';

export function Brand({ subtitle }: { subtitle: string }) {
  return (
    <div className={styles.brand}>
      <span className={`${styles.mark} px`}>
        <Image src="/brand/sapientia-logo.jpg" alt="" width={40} height={40} />
      </span>
      <div>
        <b>SAPIENTIA</b>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}
