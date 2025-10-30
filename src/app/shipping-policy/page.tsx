import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function ShippingPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="prose prose-invert max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold font-headline mb-6">Shipping Policy</h1>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Digital Product Delivery</h2>
          <p>
            Welcome to EVYKA! All of our products are high-quality digital images, and as such, there are no physical items to be shipped.
          </p>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Instant Delivery</h3>
          <p>
            Upon successful completion and verification of your payment, your purchased digital images will be made available to you instantly. The blur on the image will be removed, granting you immediate access to the high-resolution version directly on our website.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">How to Access Your Purchase</h3>
          <p>
            Once your purchase is complete, simply navigate back to the image you bought. You will find that you now have full, unrestricted access to the image without any watermarks or blurring. You can view it in the full-screen viewer and enjoy the high-quality version.
          </p>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">No Shipping Costs</h3>
          <p>
            As our products are delivered digitally, there are no shipping fees or additional costs associated with delivery. The price you see is the final price you pay.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">Issues with Delivery</h3>
          <p>
            In the rare event that you complete a purchase but do not receive immediate access to your image, please do not hesitate to contact our support team. We will ensure the issue is resolved promptly. Please have your order details ready to help us assist you as quickly as possible.
          </p>

           <h3 className="text-xl font-semibold mt-6 mb-3">Contact Us</h3>
          <p>
            If you have any questions about our shipping policy or your order, please feel free to reach out to us through our contact channels.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
