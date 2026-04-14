'use client'

import React from "react"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTranslations } from '@/lib/translations'
import { getAllLoans, getAllMembers, updateLoan, addLoan } from '@/lib/data-store'
import { Plus, Edit2 } from 'lucide-react'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'

export default function AdminLoansPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [loans, setLoans] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [borrowerId, setBorrowerId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<'active' | 'repaid' | 'defaulted'>('active')
  const [repaidAmount, setRepaidAmount] = useState('0')

  useEffect(() => {

    const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    if (savedLanguage) {
      setLanguage(savedLanguage)
    }

    if (!isLoading && !user) {
      router.push('/signin')
    } else if (!isLoading && effectiveRole !== 'chairman' && effectiveRole !== 'accountant') {
      router.push('/dashboard')
    }
  }, [user, isLoading, router, effectiveRole])

 useEffect(() => {
  if (isLoading) return
  if (!user) return
  if (effectiveRole !== 'chairman' && effectiveRole !== 'accountant') return

  const loadData = async () => {
    const loansData = await getAllLoans()
    const membersData = await getAllMembers()
    setLoans(Array.isArray(loansData) ? loansData : [])
    setMembers(Array.isArray(membersData) ? membersData : [])
  }

  loadData()
}, [user, isLoading, effectiveRole])


  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!borrowerId || !amount) {
    alert(t('pleaseFillAllFields'))
    return
  }

  if (editingId) {
    await updateLoan(editingId, {
      status,
      repaidAmount: Number(repaidAmount || 0),
      date,
    } as any)
  } else {
    await addLoan({
      borrowerId,
      amount: Number(amount),
      repaidAmount: Number(repaidAmount || 0),
      date,
      status,
    } as any)
  }

  const loansData = await getAllLoans()
  setLoans(Array.isArray(loansData) ? loansData : [])
  resetForm()
}

  const resetForm = () => {
    setBorrowerId('')
    setAmount('')
    setDate(new Date().toISOString().split('T')[0])
    setStatus('active')
    setRepaidAmount('0')
    setEditingId(null)
    setFormOpen(false)
  }

  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    return member ? member.name : memberId
  }

  const isLoading_state = isLoading
  if (isLoading_state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!user || (effectiveRole !== 'chairman' && effectiveRole !== 'accountant')) {
  return null
}


  return (
    <div className="min-h-screen">
      <Navbar
        language={language}
        onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-4">
          <BackToDashboardButton label={t('back')} />
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">
              {t('adminLoanManagement')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('adminLoanManagementSubtitle')}
            </p>
          </div>
          <Button onClick={() => setFormOpen(!formOpen)} className="btn-glass gap-2">
            <Plus className="w-4 h-4" />
            {t('addLoan')}
          </Button>
        </div>

        {formOpen && (
          <Card className="mb-8 card-glass">
            <CardHeader>
              <CardTitle>
                {editingId
                  ? t('editLoan')
                  : t('newLoan')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label>{t('borrower')}</Label>
                    <Select value={borrowerId} onValueChange={setBorrowerId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('amount')} (৳)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label>{t('date')}</Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>{t('status')}</Label>
                    <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t('loanStatusActive')}</SelectItem>
                        <SelectItem value="repaid">{t('loanStatusRepaid')}</SelectItem>
                        <SelectItem value="defaulted">{t('loanStatusDefaulted')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('repaidAmount')} (৳)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={repaidAmount}
                      onChange={(e) => setRepaidAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="btn-glass">
                    {editingId ? t('update') : t('add')}
                  </Button>
                  <Button type="button" variant="outline" className="btn-glass" onClick={resetForm}>
                    {t('cancel')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('allLoans')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loans.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t('noLoansRecordedYet')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('borrower')}</TableHead>
                      <TableHead className="text-right">{t('amount')}</TableHead>
                      <TableHead className="text-right">{t('repaid')}</TableHead>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map(loan => (
                      <TableRow key={loan.id}>
                        <TableCell>{getMemberName(loan.borrowerId)}</TableCell>
                        <TableCell className="text-right">৳{loan.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">৳{loan.repaidAmount.toLocaleString()}</TableCell>
                        <TableCell>{new Date(loan.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            loan.status === 'active' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            loan.status === 'repaid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {loan.status === 'active'
                              ? t('loanStatusActive')
                              : loan.status === 'repaid'
                                ? t('loanStatusRepaid')
                                : t('loanStatusDefaulted')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="btn-glass"
                              onClick={() => {
                                setEditingId(loan.id)
                                setBorrowerId(loan.borrowerId)
                                setAmount(loan.amount.toString())
                                setDate(loan.date)
                                setStatus(loan.status)
                                setRepaidAmount(loan.repaidAmount.toString())
                                setFormOpen(true)
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
