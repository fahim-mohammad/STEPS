'use client'

import Link from 'next/link'
import { Mail, Phone, FileText, ShieldCheck } from 'lucide-react'
import { useTranslations } from '@/lib/translations'

export function Footer() {
  const { t } = useTranslations('en') // keep your language logic if dynamic

  return (
    <footer className="w-full mt-10">
      <div className="container mx-auto px-4 pb-6">
        <div className="card-glass p-6">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            
            {/* Left */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold">{t('footer_contact_title')}</h3>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4" />
                stepsfund140@gmail.com
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4" />
                01888616923
              </div>
            </div>

            {/* Right */}
            <div className="md:text-right space-y-3">
              <h3 className="text-xl font-semibold">{t('footer_agreements_title')}</h3>

              <div className="flex md:justify-end gap-6 text-sm">
                <Link href="/terms" className="flex items-center gap-2 hover:underline">
                  <FileText className="w-4 h-4" />
                  {t('footer_terms')}
                </Link>

                <Link href="/privacy" className="flex items-center gap-2 hover:underline">
                  <ShieldCheck className="w-4 h-4" />
                  {t('footer_privacy')}
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t text-center text-xs">
            © {new Date().getFullYear()} STEPS. {t('footer_rights')}
          </div>
        </div>
      </div>
    </footer>
  )
}