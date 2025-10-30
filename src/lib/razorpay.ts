'use server';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { z } from 'zod';
import type { Order } from 'razorpay/dist/types/orders';
import type { Subscription } from 'razorpay/dist/types/subscription';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';


const CreateOrderInputSchema = z.object({
  amount: z.number().min(1, { message: 'Amount must be at least 1' }),
  imageTitle: z.string(),
});

const VerifyPaymentInputSchema = z.object({
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature: z.string(),
});

const VerifySubscriptionInputSchema = z.object({
    razorpay_payment_id: z.string(),
    razorpay_subscription_id: z.string(),
    razorpay_signature: z.string(),
});


if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('Razorpay API keys are not configured in environment variables.');
}

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function createOrder(
  input: z.infer<typeof CreateOrderInputSchema>
): Promise<Order | null> {
  try {
    const validation = CreateOrderInputSchema.safeParse(input);
    if (!validation.success) {
      throw new Error(validation.error.issues.map(i => i.message).join(', '));
    }

    const options = {
      amount: validation.data.amount * 100, // Amount in paise
      currency: 'INR',
      receipt: `receipt_image_${Date.now()}`,
      notes: {
        purchaseType: 'image',
        imageTitle: validation.data.imageTitle,
      },
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Failed to create Razorpay order:', error);
    return null;
  }
}

export async function verifyPayment(input: z.infer<typeof VerifyPaymentInputSchema>): Promise<{ isSignatureValid: boolean }> {
    try {
        const validation = VerifyPaymentInputSchema.safeParse(input);
        if (!validation.success) {
            throw new Error('Invalid payment verification data.');
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = validation.data;
        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(body.toString())
            .digest('hex');
    
        const isSignatureValid = expectedSignature === razorpay_signature;

        return { isSignatureValid };

    } catch (error) {
        console.error('Failed to verify Razorpay payment:', error);
        return { isSignatureValid: false };
    }
}

export async function createSubscription(): Promise<Subscription | null> {
    try {
        const { firestore } = initializeFirebase();
        const settingsRef = doc(firestore, 'settings', 'main');
        const settingsSnap = await getDoc(settingsRef);
        const settings = settingsSnap.data();

        const subscriptionPrice = settings?.subscriptionPrice || 79; // Default to 79 INR if not set

        // Step 1: Check if plan exists
        let planId = process.env.RAZORPAY_PLAN_ID;
        if (!planId) {
            // Step 2: Create a plan if it doesn't exist
            const plan = await razorpay.plans.create({
                period: 'monthly',
                interval: 1,
                item: {
                    name: 'EVYKA Pro Monthly',
                    amount: subscriptionPrice * 100, // Amount in paise
                    currency: 'INR',
                    description: 'Monthly subscription for EVYKA Pro access.'
                },
                notes: {
                    plan_type: 'standard_monthly'
                }
            });
            planId = plan.id;
            console.log(`Created new Razorpay Plan with ID: ${planId}. Consider setting this as RAZORPAY_PLAN_ID in your environment variables.`);
        }
        
        // Step 3: Create a subscription
        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            customer_notify: 1,
            quantity: 1,
            total_count: 120, // e.g., for 10 years
            notes: {
                source: 'evyka-webapp'
            }
        });

        return subscription;

    } catch (error) {
        console.error('Failed to create Razorpay subscription:', error);
        return null;
    }
}

export async function verifySubscription(input: z.infer<typeof VerifySubscriptionInputSchema>): Promise<{ isSignatureValid: boolean }> {
    try {
        const validation = VerifySubscriptionInputSchema.safeParse(input);
        if (!validation.success) {
            throw new Error('Invalid subscription verification data.');
        }

        const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = validation.data;
        const body = `${razorpay_payment_id}|${razorpay_subscription_id}`;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(body.toString())
            .digest('hex');

        return { isSignatureValid: expectedSignature === razorpay_signature };

    } catch (error) {
        console.error('Failed to verify Razorpay subscription:', error);
        return { isSignatureValid: false };
    }
}
