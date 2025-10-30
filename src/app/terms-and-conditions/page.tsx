import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function TermsAndConditionsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="prose prose-invert max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold font-headline mb-6">Terms and Conditions</h1>
          
          <p>Welcome to EVYKA. These terms and conditions outline the rules and regulations for the use of our website and services.</p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
          <p>By accessing this website, we assume you accept these terms and conditions. Do not continue to use EVYKA if you do not agree to all of the terms and conditions stated on this page.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Intellectual Property Rights</h2>
          <p>Other than the content you own, under these Terms, EVYKA and/or its licensors own all the intellectual property rights and materials contained in this Website. Upon purchase, you are granted a license to use the digital images for personal, non-commercial use only. You are specifically restricted from all of the following:</p>
          <ul>
            <li>Publishing any website material in any other media;</li>
            <li>Selling, sublicensing and/or otherwise commercializing any website material;</li>
            <li>Publicly performing and/or showing any website material;</li>
            <li>Using this Website in any way that is or may be damaging to this Website;</li>
            <li>Using this Website in any way that impacts user access to this Website.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. User Accounts</h2>
          <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our service.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Purchases</h2>
          <p>If you wish to purchase any product or service made available through the Service ("Purchase"), you may be asked to supply certain information relevant to your Purchase including, without limitation, your payment information. All payments are processed through our third-party payment gateway, Razorpay. We do not store or have access to your credit card details.</p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Governing Law</h2>
          <p>These Terms will be governed by and interpreted in accordance with the laws of the jurisdiction in which the company is based, and you submit to the non-exclusive jurisdiction of the state and federal courts located in that jurisdiction for the resolution of any disputes.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Changes to These Terms</h2>
          <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
