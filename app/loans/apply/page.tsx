import { redirect } from 'next/navigation'

export default function LoansApplyPage() {
  // Avoid 404s from legacy dashboard links
  redirect('/loans?view=apply')
}
