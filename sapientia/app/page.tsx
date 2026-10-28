import { redirect } from 'next/navigation';

/** The home page is the sign-in; a student who is already signed in is passed on to /student from there. */
export default function Home() {
  redirect('/login');
}
