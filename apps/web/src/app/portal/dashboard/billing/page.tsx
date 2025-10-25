'use client';

/**
 * Billing & Payment History Page
 * 
 * Displays patient's invoices, payments, and billing information
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  date: string;
  description: string;
  invoiceId?: string;
}

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    // Mock data - replace with actual API call
    setTimeout(() => {
      const mockPayments: Payment[] = [
        {
          id: '1',
          amount: 150.00,
          currency: 'USD',
          status: 'PAID',
          paymentMethod: 'Visa •••• 4242',
          date: new Date('2025-01-15').toISOString(),
          description: 'Consulta General - Dr. Juan Pérez',
        },
        {
          id: '2',
          amount: 250.00,
          currency: 'USD',
          status: 'PAID',
          paymentMethod: 'MasterCard •••• 5555',
          date: new Date('2024-12-20').toISOString(),
          description: 'Análisis de Sangre Completo',
        },
        {
          id: '3',
          amount: 75.00,
          currency: 'USD',
          status: 'PENDING',
          paymentMethod: 'Pendiente',
          date: new Date('2025-01-20').toISOString(),
          description: 'Consulta de Seguimiento',
        },
      ];

      setPayments(mockPayments);
      setTotalPaid(mockPayments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0));
      setTotalPending(mockPayments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0));
      setLoading(false);
    }, 500);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'FAILED':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'REFUNDED':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID': return 'Pagado';
      case 'PENDING': return 'Pendiente';
      case 'FAILED': return 'Fallido';
      case 'REFUNDED': return 'Reembolsado';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="text-4xl">💳</span>
            <span>Facturación y Pagos</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Historial de pagos y facturas
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Pagado</span>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-3xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Este año</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendiente</span>
              <span className="text-2xl">⏳</span>
            </div>
            <p className="text-3xl font-bold text-yellow-600">${totalPending.toFixed(2)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Por pagar</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Transacciones</span>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{payments.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total este año</p>
          </motion.div>
        </div>

        {/* Payment History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Historial de Pagos
            </h2>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {payments.map((payment, index) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {payment.description}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                        {getStatusLabel(payment.status)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{format(new Date(payment.date), "d 'de' MMM, yyyy", { locale: es })}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span>{payment.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${payment.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{payment.currency}</p>
                    
                    {payment.status === 'PAID' && (
                      <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                        Descargar Factura
                      </button>
                    )}
                    
                    {payment.status === 'PENDING' && (
                      <button className="mt-2 px-4 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Pagar Ahora
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Métodos de Pago
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">VISA</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">•••• 4242</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Expira 12/2026</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                Principal
              </span>
            </div>

            <button className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors">
              + Agregar Método de Pago
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
