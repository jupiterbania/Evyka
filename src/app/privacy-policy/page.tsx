import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="prose prose-invert max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold font-headline mb-6">Privacy Policy</h1>
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <p>EVYKA ("us", "we", or "our") operates the EVYKA website (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.</p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Information Collection and Use</h2>
          <p>We collect several different types of information for various purposes to provide and improve our Service to you.</p>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Personal Data</h3>
          <p>While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to:</p>
          <ul>
            <li>Email address</li>
            <li>First name and last name (via Google Sign-In)</li>
            <li>Profile picture URL (via Google Sign-In)</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Use of Data</h2>
          <p>EVYKA uses the collected data for various purposes:</p>
          <ul>
            <li>To provide and maintain the Service</li>
            <li>To manage your account and your purchases</li>
            <li>To provide customer care and support</li>
            <li>To monitor the usage of the Service</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Data Security</h2>
          <p>The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.</p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Service Providers</h2>
          <p>We may employ third-party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, to perform Service-related services or to assist us in analyzing how our Service is used. These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose. This includes Google (for authentication) and Razorpay (for payment processing).</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Changes to This Privacy Policy</h2>
          <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.</p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us via our Instagram page.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
