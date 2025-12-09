'use client';

import { useState, useEffect } from 'react';
import { toast, Toaster } from 'react-hot-toast';

interface InvitationCode {
  id: string;
  code: string;
  codeType: string;
  isActive: boolean;
  isUsed: boolean;
  maxUses: number;
  usedCount: number;
  notes: string | null;
  createdAt: string;
  expiresAt: string | null;
  usedBy: Array<{
    email: string;
    createdAt: string;
  }>;
}

interface CodesData {
  codes: InvitationCode[];
  first100Count: number;
  first100Remaining: number;
}

export default function AdminInvitationsPage() {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<CodesData | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [maxUses, setMaxUses] = useState(1);
  const [notes, setNotes] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');

  const authenticate = async () => {
    if (!adminKey) {
      toast.error('Por favor ingresa la clave admin');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/invitations', {
        headers: {
          'Authorization': `Bearer ${adminKey}`,
        },
      });

      if (response.ok) {
        setIsAuthenticated(true);
        const data = await response.json();
        setData(data);
        toast.success('Autenticado correctamente');
      } else {
        toast.error('Clave admin incorrecta');
      }
    } catch (error) {
      toast.error('Error al autenticar');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/invitations', {
        headers: {
          'Authorization': `Bearer ${adminKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setData(data);
      }
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codeType: 'FRIEND_FAMILY',
          maxUses: maxUses,
          notes: notes || null,
          expiresInDays: expiresInDays ? parseInt(expiresInDays) : null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Código generado: ${result.code}`);
        
        // Copy to clipboard
        await navigator.clipboard.writeText(result.code);
        toast.success('Código copiado al portapapeles');
        
        // Reset form
        setNotes('');
        setExpiresInDays('');
        
        // Reload data
        await loadData();
      } else {
        toast.error(result.error || 'Error al generar código');
      }
    } catch (error) {
      toast.error('Error al generar código');
    } finally {
      setLoading(false);
    }
  };

  const deactivateCode = async (code: string) => {
    if (!confirm(`¿Desactivar código ${code}?`)) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        toast.success('Código desactivado');
        await loadData();
      } else {
        toast.error('Error al desactivar código');
      }
    } catch (error) {
      toast.error('Error al desactivar código');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] flex items-center justify-center p-6">
        <Toaster position="top-right" />
        <div className="max-w-md w-full bg-white dark:bg-[#0F1214] rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-white/10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            🔐 Admin Access
          </h1>
          <p className="text-gray-600 dark:text-white/70 mb-6">
            Ingresa la clave admin para gestionar códigos de invitación
          </p>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && authenticate()}
            placeholder="Admin API Key"
            className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white mb-4 focus:border-[#00FF88] focus:ring-2 focus:ring-[#00FF88]/20 outline-none"
          />
          <button
            onClick={authenticate}
            disabled={loading}
            className="w-full bg-[#00FF88] text-black font-bold py-3 rounded-lg hover:bg-[#00e97a] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Autenticando...' : 'Autenticar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] p-6">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              📨 Gestión de Invitaciones
            </h1>
            <p className="text-gray-600 dark:text-white/70">
              Genera y gestiona códigos de invitación para amigos y familiares
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 dark:bg-white/10 rounded-lg hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
          >
            🔄 Recargar
          </button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-[#0F1214] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="text-3xl font-bold text-[#00FF88] mb-2">
              {data?.first100Count || 0} / 100
            </div>
            <div className="text-sm text-gray-600 dark:text-white/60">
              Primeros 100 usuarios registrados
            </div>
            <div className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
              {data?.first100Remaining || 0} espacios restantes
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#0F1214] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {data?.codes.filter(c => c.isActive).length || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-white/60">
              Códigos activos
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#0F1214] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
              {data?.codes.reduce((sum, c) => sum + c.usedCount, 0) || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-white/60">
              Total códigos usados
            </div>
          </div>
        </div>

        {/* Generate Code Form */}
        <div className="bg-white dark:bg-[#0F1214] rounded-2xl p-8 border border-gray-200 dark:border-white/10 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            🎁 Generar Nuevo Código
          </h2>
          
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-white/70 mb-2">
                Usos máximos
              </label>
              <input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:border-[#00FF88] focus:ring-2 focus:ring-[#00FF88]/20 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-white/70 mb-2">
                Expira en (días)
              </label>
              <input
                type="number"
                min="0"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                placeholder="Sin expiración"
                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:border-[#00FF88] focus:ring-2 focus:ring-[#00FF88]/20 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-white/70 mb-2">
                Notas
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Para: Juan Pérez"
                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:border-[#00FF88] focus:ring-2 focus:ring-[#00FF88]/20 outline-none"
              />
            </div>
          </div>
          
          <button
            onClick={generateCode}
            disabled={loading}
            className="w-full bg-[#00FF88] text-black font-bold py-3 rounded-lg hover:bg-[#00e97a] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Generando...' : '✨ Generar Código'}
          </button>
        </div>

        {/* Codes Table */}
        <div className="bg-white dark:bg-[#0F1214] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-white/10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              📋 Códigos de Invitación
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-white/70 uppercase">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-white/70 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-white/70 uppercase">Usos</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-white/70 uppercase">Notas</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-white/70 uppercase">Creado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-white/70 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {data?.codes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-6 py-4">
                      <code className="font-mono font-bold text-[#00FF88]">{code.code}</code>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        code.isUsed 
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          : code.isActive 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {code.isUsed ? 'Usado' : code.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {code.usedCount} / {code.maxUses}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-white/70">
                      {code.notes || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-white/70">
                      {new Date(code.createdAt).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4">
                      {code.isActive && !code.isUsed && (
                        <button
                          onClick={() => deactivateCode(code.code)}
                          className="text-sm text-red-600 dark:text-red-400 hover:underline"
                        >
                          Desactivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

