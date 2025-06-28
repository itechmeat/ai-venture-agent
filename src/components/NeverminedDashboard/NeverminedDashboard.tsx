import React, { useState, useEffect } from 'react';
import { Card, Box, Text, Button, Flex, Separator, Badge } from '@radix-ui/themes';
import styles from './NeverminedDashboard.module.scss';

interface PaymentTransaction {
  agreementId: string;
  did: string;
  amount: string;
  tokenAddress: string;
  consumer: string;
  provider: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
}

interface AuthStatus {
  isLoggedIn: boolean;
  accountAddress?: string;
  balance?: string;
}

interface Earnings {
  total: string;
  monthly: string;
  transactions: PaymentTransaction[];
}

export function NeverminedDashboard() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ isLoggedIn: false });
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/nevermined/auth');
      const data = await response.json();
      
      if (data.success) {
        setAuthStatus(data);
        if (data.isLoggedIn) {
          await loadEarnings();
        }
      }
    } catch {
      setError('Failed to check authentication status');
    } finally {
      setLoading(false);
    }
  };

  const loadEarnings = async () => {
    try {
      const response = await fetch('/api/nevermined/payments?action=earnings');
      const data = await response.json();
      
      if (data.success) {
        setEarnings(data.data);
      }
    } catch {
      // Handle earnings loading error silently
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/nevermined/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await checkAuthStatus();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/nevermined/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
      
      if (response.ok) {
        setAuthStatus({ isLoggedIn: false });
        setEarnings(null);
      }
    } catch {
      setError('Failed to logout');
    }
  };

  const publishAIService = async () => {
    try {
      const serviceData = {
        action: 'publish-ai-service',
        metadata: {
          name: process.env.NEVERMINED_AGENT_NAME || 'Venture Capital Analysis Service',
          description: process.env.NEVERMINED_AGENT_DESCRIPTION || 'AI-powered analysis of startup investments and market trends',
          author: authStatus.accountAddress,
          license: 'MIT',
          dateCreated: new Date().toISOString(),
          contentType: 'application/json',
          tags: ['ai', 'venture-capital', 'analysis', 'fintech'],
          categories: ['artificial-intelligence', 'finance'],
          agentDid: process.env.NEVERMINED_AGENT_DID
        },
        pricing: {
          price: '10',
          tokenAddress: process.env.NEVERMINED_TOKEN_ADDRESS || '0x1234567890abcdef1234567890abcdef12345678',
          paymentType: 'subscription' as const,
          duration: 30
        },
        serviceEndpoint: process.env.NEVERMINED_SERVICE_ENDPOINT || '/api/make-decision',
        openApiSpec: {
          openapi: '3.0.0',
          info: { title: 'VC Analysis API', version: '1.0.0' },
          paths: {
            '/analyze': {
              post: {
                summary: 'Analyze startup investment opportunity',
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          startup: { type: 'object' },
                          expert: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const response = await fetch('/api/nevermined/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData)
      });

      const result = await response.json();
      if (result.success) {
        // Service published successfully - could show notification
      }
    } catch {
      setError('Failed to publish AI service');
    }
  };

  if (loading) {
    return (
      <Box className={styles.dashboard}>
        <Card>
          <Text>Loading Nevermined dashboard...</Text>
        </Card>
      </Box>
    );
  }

  if (!authStatus.isLoggedIn) {
    return (
      <Box className={styles.dashboard}>
        <Card>
          <Flex direction="column" gap="4">
            <Text size="6" weight="bold">Nevermined Integration</Text>
            <Text>Connect to Nevermined to monetize your AI services</Text>
            {error && <Text color="red">{error}</Text>}
            <Button onClick={handleLogin} disabled={loading}>
              Create Nevermined Account
            </Button>
          </Flex>
        </Card>
      </Box>
    );
  }

  return (
    <Box className={styles.dashboard}>
      <Flex direction="column" gap="4">
        <Card>
          <Flex justify="between" align="center">
            <Box>
              <Text size="6" weight="bold">Nevermined Dashboard</Text>
              <Text size="2" color="gray">
                Account: {authStatus.accountAddress?.slice(0, 10)}...
              </Text>
            </Box>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </Flex>
        </Card>

        <Flex gap="4">
          <Card style={{ flex: 1 }}>
            <Flex direction="column" gap="2">
              <Text size="4" weight="bold">Account Balance</Text>
              <Text size="6">{authStatus.balance || '0'} ETH</Text>
            </Flex>
          </Card>

          {earnings && (
            <>
              <Card style={{ flex: 1 }}>
                <Flex direction="column" gap="2">
                  <Text size="4" weight="bold">Total Earnings</Text>
                  <Text size="6">{earnings.total} NVT</Text>
                </Flex>
              </Card>

              <Card style={{ flex: 1 }}>
                <Flex direction="column" gap="2">
                  <Text size="4" weight="bold">Monthly Earnings</Text>
                  <Text size="6">{earnings.monthly} NVT</Text>
                </Flex>
              </Card>
            </>
          )}
        </Flex>

        <Card>
          <Flex direction="column" gap="4">
            <Text size="5" weight="bold">AI Services</Text>
            <Button onClick={publishAIService}>
              Publish VC Analysis Service
            </Button>
          </Flex>
        </Card>

        {earnings?.transactions && earnings.transactions.length > 0 && (
          <Card>
            <Flex direction="column" gap="4">
              <Text size="5" weight="bold">Recent Transactions</Text>
              {earnings.transactions.slice(0, 5).map((tx) => (
                <Box key={tx.agreementId}>
                  <Flex justify="between" align="center">
                    <Box>
                      <Text size="3" weight="medium">
                        {tx.amount} tokens
                      </Text>
                      <Text size="2" color="gray">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </Text>
                    </Box>
                    <Badge color={tx.status === 'completed' ? 'green' : 'orange'}>
                      {tx.status}
                    </Badge>
                  </Flex>
                  <Separator my="2" />
                </Box>
              ))}
            </Flex>
          </Card>
        )}

        {error && (
          <Card>
            <Text color="red">{error}</Text>
          </Card>
        )}
      </Flex>
    </Box>
  );
}