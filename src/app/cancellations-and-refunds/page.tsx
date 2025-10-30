import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function CancellationsAndRefundsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="prose prose-invert max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold font-headline mb-6">Cancellations and Refunds Policy</h1>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">All Sales Are Final</h2>
          <p>
            Due to the digital nature of our products, all sales are final. Once a purchase is completed and you have gained access to the high-resolution digital image, we are unable to offer a refund, cancellation, or exchange.
          </p>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Nature of Digital Products</h3>
          <p>
            When you purchase an image from EVYKA, you receive immediate access to the digital file. Unlike physical goods, digital items cannot be returned. Therefore, we have a strict no-refund policy. We encourage you to carefully review the image previews before making a purchase.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">Exceptional Circumstances</h3>
          <p>
            We may consider refunds only in exceptional circumstances, such as a duplicate purchase of the same image on the same account. If you believe you have been charged in error, please contact our support team with your order details.
          </p>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Contact Us</h3>
          <p>
            If you have any questions about our Cancellations and Refunds Policy, please feel free to reach out to us through our Instagram page.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
