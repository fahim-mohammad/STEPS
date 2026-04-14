import { redirect } from "next/navigation"

export default function ContributionsPayRedirect() {
  redirect("/contributions/submit")
}
