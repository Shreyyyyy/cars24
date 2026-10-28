import { redirect } from 'next/navigation';

/**
 * This page used to show hard-coded example dealers, baselines and projections.
 * Diagnostics and outlooks now come only from the uploaded data, on the Growth Opportunities page.
 */
export default function Page() {
  redirect('/recommendations');
}
