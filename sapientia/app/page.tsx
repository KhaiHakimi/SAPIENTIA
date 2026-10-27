import { redirect } from 'next/navigation';

/** Sign-in is not built yet (plan Sprint 2), so the home page goes straight to the student board. */
export default function Home() {
  redirect('/student');
}
