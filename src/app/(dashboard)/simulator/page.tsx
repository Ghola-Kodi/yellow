// app/(dashboard)/simulator/page.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  CreditCard, 
  Mail, 
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Copy,
  ExternalLink,
  Play,
  RefreshCw,
  XCircle,
  Info
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { DemoModeBanner } from '@/components/dashboard/DemoModeBanner';
import { StripeTestCards } from '@/components/demo/StripeTestCards';
import { SimulatorPanel } from '@/components/dashboard/SimulatorPanel';
import { TEST_CARDS } from '@/lib/stripe/client';

export default function SimulatorPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string>(TEST_CARDS.success);
  const [email, setEmail] = useState('demo+customer@example.com');
  const [amount, setAmount] = useState('99.00');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const simulateFailure = async (declineType: 'soft' | 'hard') => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          amount: parseFloat(amount) * 100,
          declineType,
          attemptCount: 1,
          isTestMode: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to simulate failure');
      }

      setResult(data);

      // Navigate to the failure detail after 1.5 seconds
      setTimeout(() => {
        if (data.id) {
          router.push(`/failures/${data.id}`);
        }
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebhookSimulation = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // This would call the actual webhook endpoint with a test payload
      const response = await fetch('/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `evt_sim_${Date.now()}`,
          type: 'invoice.payment_failed',
          data: {
            object: {
              customer: `cus_sim_${Date.now()}`,
              customer_email: email,
              amount_due: parseFloat(amount) * 100,
              currency: 'usd',
              attempt_count: 1,
              last_payment_error: {
                code: 'insufficient_funds',
                message: 'Insufficient funds',
              },
            },
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Webhook simulation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Demo Mode Banner */}
      <DemoModeBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🧪 Simulator
            <Badge variant="warning" className="text-xs">Demo Mode</Badge>
          </h1>
          <p className="text-gray-400 text-sm">
            Test the recovery engine with Stripe test cards and simulated webhooks
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            No real payments
          </span>
          <span className="w-px h-4 bg-gray-700" />
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            Instant results
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Simulator Card */}
          <Card className="p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Play className="w-4 h-4 text-blue-400" />
              Trigger a Failure
            </h3>

            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Customer Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@example.com"
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Amount ($)
                </label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="99.00"
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Simulate a payment failure:</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => simulateFailure('soft')}
                  disabled={isLoading}
                  className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 flex items-center gap-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  Soft Decline
                </Button>
                <Button
                  onClick={() => simulateFailure('hard')}
                  disabled={isLoading}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 flex items-center gap-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Hard Decline
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-800"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-gray-900 text-gray-500">OR</span>
                </div>
              </div>

              <Button
                onClick={handleWebhookSimulation}
                disabled={isLoading}
                variant="outline"
                className="w-full border-gray-700 hover:border-gray-600 flex items-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Activity className="w-4 h-4" />
                )}
                Simulate Full Webhook (Stripe → Klaviyo)
              </Button>
            </div>

            {/* Result */}
            {(result || error) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                {error ? (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-sm flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      {error}
                    </p>
                  </div>
                ) : result && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <p className="text-green-400 text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Failure simulated successfully!
                    </p>
                    {result.id && (
                      <p className="text-xs text-gray-400 mt-1">
                        Redirecting to failure #{result.id.slice(0, 8)}...
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </Card>

          {/* Instructions */}
          <Card className="p-4 bg-blue-500/5 border-blue-500/20">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-400">How to Demo</h4>
                <ol className="text-xs text-gray-400 space-y-1 mt-1 list-decimal list-inside">
                  <li>Click "Soft Decline" or "Hard Decline" to simulate a failure</li>
                  <li>Watch the failure appear in the live feed on the dashboard</li>
                  <li>Click "View →" to see the 4-step recovery timeline</li>
                  <li>Check Klaviyo to see the event was triggered</li>
                  <li>Try different scenarios with the test cards below</li>
                </ol>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Panel - Test Cards & Status */}
        <div className="space-y-6">
          <StripeTestCards />

          <Card className="p-4">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-400" />
              Klaviyo Status
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Connection</span>
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Test Mode
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Flow: Soft Reminder</span>
                <span className="text-gray-300">✓ Configured</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Flow: Hard Urgent</span>
                <span className="text-gray-300">✓ Configured</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Flow: Win-back</span>
                <span className="text-gray-300">✓ Configured</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-dashed border-gray-700">
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-gray-400" />
              Quick Links
            </h4>
            <div className="space-y-1">
              <a 
                href="https://dashboard.stripe.com/test/webhooks" 
                target="_blank"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                Stripe Webhooks Dashboard
                <ArrowRight className="w-3 h-3" />
              </a>
              <a 
                href="https://www.klaviyo.com/flow" 
                target="_blank"
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                Klaviyo Flows
                <ArrowRight className="w-3 h-3" />
              </a>
              <a 
                href="/dashboard" 
                className="text-xs text-gray-400 hover:text-gray-300 flex items-center gap-1"
              >
                View Live Feed
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}