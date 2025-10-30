'use server';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { z } from 'zod';
import type { Order } from 'razorpay/dist/types/orders';
import type { Subscription } from 'razorpay/dist/types/subscription';


const CreateOrderInputSchema = z.object({
  amount: z.number().min(1, { message: 'Amount must be at least 1' }),
  imageTitle: z.string(),
});

const VerifyPaymentInputSchema = z.object({
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature: z.string(),
});

const CreateSubscriptionInputSchema = z.object({
    price: z.number().min(1, { message: 'Price must be at least 1' }),
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

export async function createSubscription(input: z.infer<typeof CreateSubscriptionInputSchema>): Promise<Subscription | null> {
    try {
        const validation = CreateSubscriptionInputSchema.safeParse(input);
        if (!validation.success) {
            throw new Error(validation.error.issues.map(i => i.message).join(', '));
        }
        
        const { price } = validation.data;

        // Step 1: Ensure a plan ID is configured in the environment.
        const planId = process.env.RAZORPAY_PLAN_ID;
        
        if (!planId) {
            // A plan must be created manually in Razorpay dashboard and its ID set in .env
            console.error('RAZORPAY_PLAN_ID is not set in environment variables.');
            
            // To help with setup, we can create a plan once if needed, but it's better to do it manually.
            try {
                const plan = await razorpay.plans.create({
                    period: 'monthly',
                    interval: 1,
                    item: {
                        name: 'EVYKA Pro Monthly Subscription',
                        amount: price * 100, // Amount in paise
                        currency: 'INR',
                        description: 'Full access to all exclusive content.'
                    },
                });
                console.log(`No RAZORPAY_PLAN_ID was found, so a new plan was created. ID: ${plan.id}. Please set this ID in your environment variables as RAZORPAY_PLAN_ID to avoid creating duplicate plans.`);
                
                // For this request, we'll use the newly created plan ID.
                const subscription = await razorpay.subscriptions.create({
                    plan_id: plan.id,
                    customer_notify: 1,
                    total_count: 120, // 10 years of monthly payments
                });
                return subscription;

            } catch (planError) {
                console.error('Could not create a new Razorpay plan:', planError);
                throw new Error('Could not create a subscription plan. Please contact support.');
            }
        }
        
        // Step 2: Create a subscription using the existing plan ID
        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            customer_notify: 1,
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
