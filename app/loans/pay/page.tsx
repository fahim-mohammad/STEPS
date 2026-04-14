import { redirect } from 'next/navigation'

export default function LoansPayPage() {
  // Avoid 404s from legacy dashboard links
  redirect('/loans?view=pay')
}
