import { redirect } from 'next/navigation'

export default function NewCurationRedirectPage() {
  redirect('/admin/curation?create=1')
}
