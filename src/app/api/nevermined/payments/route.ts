import { NextRequest, NextResponse } from 'next/server';
import { neverminedPayments } from '@/lib/nevermined';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const tokenAddress = searchParams.get('tokenAddress');

  try {
    switch (action) {
      case 'history':
        const history = await neverminedPayments.getPaymentHistory();
        return NextResponse.json({
          success: true,
          data: history
        });

      case 'earnings':
        const earnings = await neverminedPayments.getEarnings();
        return NextResponse.json({
          success: true,
          data: earnings
        });

      case 'balance':
        if (!tokenAddress) {
          return NextResponse.json(
            { success: false, error: 'Token address is required' },
            { status: 400 }
          );
        }
        
        const balance = await neverminedPayments.getTokenBalance(tokenAddress);
        return NextResponse.json({
          success: true,
          data: { balance, tokenAddress }
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Payments operation failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json();

    switch (action) {
      case 'create-plan':
        const { name, description, price, tokenAddress, duration, features, maxCredits } = data;
        const plan = await neverminedPayments.createPaymentPlan(
          name,
          description,
          price,
          tokenAddress,
          duration,
          features,
          maxCredits
        );
        return NextResponse.json({
          success: true,
          data: plan,
          message: 'Payment plan created successfully'
        });

      case 'subscribe':
        const { serviceId, planId, duration: subscriptionDuration } = data;
        const subscriptionId = await neverminedPayments.subscribeToService(
          serviceId,
          planId,
          subscriptionDuration
        );
        return NextResponse.json({
          success: true,
          data: { subscriptionId },
          message: 'Subscribed to service successfully'
        });

      case 'process-payment':
        const { amount, tokenAddress: paymentTokenAddress, recipient, agreementId } = data;
        const txHash = await neverminedPayments.processPayment(
          amount,
          paymentTokenAddress,
          recipient,
          agreementId
        );
        return NextResponse.json({
          success: true,
          data: { txHash },
          message: 'Payment processed successfully'
        });

      case 'request-payout':
        const { amount: payoutAmount, address } = data;
        const payoutId = await neverminedPayments.requestPayout(payoutAmount, address);
        return NextResponse.json({
          success: true,
          data: { payoutId },
          message: 'Payout requested successfully'
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Payments operation failed' },
      { status: 500 }
    );
  }
}