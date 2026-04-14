'use client'

import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslations } from '@/lib/translations'

export default function AgreementPage() {
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  useEffect(() => {
    const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    if (savedLanguage) setLanguage(savedLanguage)
  }, [])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-10 flex-1">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Link href="/">
              <Button variant="outline" className="btn-glass gap-2">
                <ArrowLeft className="w-4 h-4" />
                {language === 'bn' ? 'হোমে ফিরে যান' : 'Back to Home'}
              </Button>
            </Link>

            <a href="/contracts/STEPS_Fund_Agreement.pdf" download>
              <Button className="btn-glass gap-2">
                <Download className="w-4 h-4" />
                {language === 'bn' ? 'চুক্তিপত্র ডাউনলোড' : 'Download Agreement'}
              </Button>
            </a>
          </div>

          <Card className="card-glass">
            <CardContent className="p-6 md:p-10 space-y-8">
              <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-bold mb-3">
                  {language === 'bn' ? 'STEPS ফান্ড: সদস্য চুক্তিপত্র' : 'STEPS Fund: Member Agreement'}
                </h1>
                <p className="text-muted-foreground text-sm md:text-base">
                  {language === 'bn'
                    ? 'নিচে STEPS ফান্ডের মূল নীতিমালা ও শর্তাবলি দেখানো হয়েছে।'
                    : 'Below are the core rules and terms of the STEPS Fund.'}
                </p>
              </div>

              {language === 'bn' ? (
                <div className="space-y-6 text-base md:text-lg leading-8">
                  <section>
                    <h2 className="font-bold text-xl mb-2">১। ফান্ডের নাম ও শুরু:</h2>
                    <p>এই ফান্ডের নাম STEPS ফান্ড। ফান্ডটি আনুষ্ঠানিকভাবে জানুয়ারি ২০২৫ থেকে কার্যকর হয়েছে।</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">২। মাসিক সদস্য অবদান:</h2>
                    <p>প্রত্যেক সদস্যকে প্রতি মাসে ১,০০০ টাকা ফান্ডে জমা দিতে হবে।</p>
                    <p>জমার সময়সীমা: প্রতি মাসের ১ তারিখ থেকে ২০ তারিখের মধ্যে।</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">৩। বিলম্ব ও জরিমানার নিয়ম:</h2>
                    <p>কোনো সদস্য নির্ধারিত সময়ে টাকা জমা না দিলে এবং উপযুক্ত কারণ না দেখালে, ৫% জরিমানা প্রযোজ্য হবে।</p>
                    <p>ক্রমাগত ৩ মাস টাকা না জমা দিলে, তার সদস্যপদ বাতিল বলে গণ্য হবে।</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">৪। কমিটি গঠন:</h2>
                    <p>সকল সদস্যের সম্মতিতে ৩ সদস্যের একটি কমিটি গঠন করা হবে:</p>
                    <ul className="list-disc pl-6">
                      <li>প্রধান (President)</li>
                      <li>হিসাবরক্ষক (Accountant)</li>
                      <li>পরামর্শদাতা (Advisor)</li>
                    </ul>
                    <p>এই কমিটি ভোটের মাধ্যমে নির্বাচিত হবে এবং একটি আলাদা চুক্তিপত্রে সবার স্বাক্ষর থাকবে।</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">৫। লোন গ্রহণের নিয়ম:</h2>
                    <p>সদস্যগণ ফান্ড থেকে লোন নিতে পারবেন।</p>
                    <p>সর্বোচ্চ লোন পরিমাণ হবে নিজের মোট জমাকৃত টাকার ৮০%।</p>
                    <p>যদি কেউ তার চেয়ে বেশি লোন চান, তাহলে তাকে কমিটির কাছে লিখিত কারণ পেশ করতে হবে।</p>
                    <p>কমিটি যদি যৌক্তিক মনে করে, তাহলে লোন অনুমোদন করা যাবে।</p>
                    <p>লোন পরিশোধের সময়সীমা:</p>
                    <ul className="list-disc pl-6">
                      <li>৫,০০০ টাকার নিচে: ১ মাস</li>
                      <li>৫,০০০ টাকার বেশি: ৩ মাস</li>
                    </ul>
                    <p>লোনে দেরি হলে ১০% জরিমানা দিতে হবে।</p>
                    <p>জরিমানা বা লোন দেরির উপযুক্ত কারণ থাকলে, কমিটি তা ক্ষমা করতে পারবে।</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">৬। সুদমুক্ত নীতি:</h2>
                    <p>এই ফান্ড সম্পূর্ণ সুদমুক্ত থাকবে।</p>
                    <p>যদি টাকা ব্যাংকে রাখা হয় এবং সুদ আসে, তবে সেই টাকা সকল সদস্যদের উপস্থিতিতে দরিদ্র ও অসহায়দের মাঝে দান করা হবে।</p>
                    <p>কোনো সদস্য বা কমিটি এই সুদের টাকা ব্যক্তিগতভাবে ব্যবহার করতে পারবে না।</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">৭। ফান্ড সংরক্ষণ ও খরচ:</h2>
                    <p>ছয় মাস পরপর প্রত্যেক সদস্যকে ১০০ টাকা অতিরিক্ত দিতে হবে, যা ফান্ডের নিত্যপ্রয়োজনীয় খরচে ব্যবহৃত হবে।</p>
                    <p>খরচের হিসাব কমিটি সকল সদস্যদের নিকট প্রকাশ করতে বাধ্য।</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">৮। জরিমানার অর্থ:</h2>
                    <p>কেউ জরিমানা দিলে, সেই অর্থ তার নামেই ফান্ডে জমা থাকবে।</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">৯। বিনিয়োগ:</h2>
                    <p>ফান্ডের টাকা কোনো উপযুক্ত ও নিরাপদ বিনিয়োগে ব্যবহার করা যেতে পারে, তবে শুধুমাত্র সকল সদস্যদের সম্মতিতে।</p>
                    <p>লাভ হলে তা সবার মাঝে ভাগ হবে,</p>
                    <p>লোকসান হলে তা সকল সদস্য ভাগ করে বহন করবেন।</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">১০। ব্যাংক অ্যাকাউন্ট:</h2>
                    <p>STEPS ফান্ডের নামে একটি ব্যাংক অ্যাকাউন্ট খোলা হবে, যার তথ্য এই চুক্তিপত্রে সংযুক্ত থাকবে।</p>
                    <p>২০,০০০ টাকার নিচে উত্তোলনের ক্ষেত্রে কেবল কমিটির প্রধানের স্বাক্ষর যথেষ্ট।</p>
                    <p>২০,০০০ টাকার বেশি উত্তোলনের জন্য কমিটির সকল সদস্যের স্বাক্ষর প্রয়োজন।</p>
                  </section>
                </div>
              ) : (
                <div className="space-y-6 text-base md:text-lg leading-8">
                  <section>
                    <h2 className="font-bold text-xl mb-2">1. Fund Name and Start</h2>
                    <p>The name of this fund is STEPS Fund. The fund has been officially effective since January 2025.</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">2. Monthly Member Contribution</h2>
                    <p>Each member must deposit 1,000 BDT into the fund every month.</p>
                    <p>Deposit deadline: from the 1st day to the 20th day of each month.</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">3. Delay and Fine Rules</h2>
                    <p>If a member fails to deposit on time without a valid reason, a 5% fine will apply.</p>
                    <p>If a member fails to deposit for 3 consecutive months, the membership will be considered cancelled.</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">4. Committee Formation</h2>
                    <p>With the consent of all members, a 3-member committee will be formed:</p>
                    <ul className="list-disc pl-6">
                      <li>President</li>
                      <li>Accountant</li>
                      <li>Advisor</li>
                    </ul>
                    <p>This committee will be selected by vote and a separate signed agreement will be maintained.</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">5. Loan Rules</h2>
                    <p>Members can take loans from the fund.</p>
                    <p>The maximum loan amount will be 80% of the member’s total deposited amount.</p>
                    <p>If anyone wants more than that, they must submit a written explanation to the committee.</p>
                    <p>If the committee finds the reason valid, the loan may be approved.</p>
                    <p>Loan repayment deadline:</p>
                    <ul className="list-disc pl-6">
                      <li>Below 5,000 BDT: 1 month</li>
                      <li>Above 5,000 BDT: 3 months</li>
                    </ul>
                    <p>If the loan is delayed, a 10% fine must be paid.</p>
                    <p>If there is a valid reason, the committee may waive the fine or delay.</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">6. Interest-Free Policy</h2>
                    <p>This fund will remain completely interest-free.</p>
                    <p>If money is kept in a bank and interest is generated, that amount will be donated to the poor and needy in the presence of all members.</p>
                    <p>No member or committee may use that interest amount personally.</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">7. Fund Maintenance and Costs</h2>
                    <p>Every six months, each member must contribute an additional 100 BDT for necessary fund expenses.</p>
                    <p>The committee is obliged to disclose the expense records to all members.</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">8. Fine Amount</h2>
                    <p>If anyone pays a fine, that amount will remain deposited in the fund under that member’s own name.</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">9. Investment</h2>
                    <p>The fund money may be used in any suitable and safe investment, but only with the consent of all members.</p>
                    <p>If there is profit, it will be distributed among all members.</p>
                    <p>If there is loss, all members will share the loss together.</p>
                  </section>

                  <section>
                    <h2 className="font-bold text-xl mb-2">10. Bank Account</h2>
                    <p>A bank account will be opened in the name of STEPS Fund, and the details will be attached to the agreement.</p>
                    <p>For withdrawals below 20,000 BDT, only the President’s signature will be enough.</p>
                    <p>For withdrawals above 20,000 BDT, signatures from all committee members will be required.</p>
                  </section>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}