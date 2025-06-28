import { NextRequest, NextResponse } from 'next/server';
import { neverminedAuth } from '@/lib/nevermined';

export async function POST(request: NextRequest) {
  try {
    const { action, privateKey, seed } = await request.json();

    switch (action) {
      case 'login':
        if (privateKey) {
          const account = await neverminedAuth.loginWithPrivateKey(privateKey);
          return NextResponse.json({
            success: true,
            accountId: account.getId(),
            message: 'Logged in successfully'
          });
        } else if (seed) {
          const account = await neverminedAuth.loginWithSeed(seed);
          return NextResponse.json({
            success: true,
            accountId: account.getId(),
            message: 'Logged in successfully'
          });
        } else {
          return NextResponse.json(
            { success: false, error: 'Private key or seed required for login' },
            { status: 400 }
          );
        }

      case 'create':
        const newAccount = await neverminedAuth.createAccount();
        return NextResponse.json({
          success: true,
          accountId: newAccount.getId(),
          message: 'Account created successfully'
        });

      case 'logout':
        neverminedAuth.logout();
        return NextResponse.json({
          success: true,
          message: 'Logged out successfully'
        });

      case 'status':
        const isLoggedIn = neverminedAuth.isLoggedIn();
        const accountAddress = isLoggedIn ? await neverminedAuth.getAccountAddress() : null;
        const balance = isLoggedIn ? await neverminedAuth.getAccountBalance() : null;
        
        return NextResponse.json({
          success: true,
          isLoggedIn,
          accountAddress,
          balance
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const isLoggedIn = neverminedAuth.isLoggedIn();
    const accountAddress = isLoggedIn ? await neverminedAuth.getAccountAddress() : null;
    const balance = isLoggedIn ? await neverminedAuth.getAccountBalance() : null;
    
    return NextResponse.json({
      success: true,
      isLoggedIn,
      accountAddress,
      balance
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to get auth status' },
      { status: 500 }
    );
  }
}