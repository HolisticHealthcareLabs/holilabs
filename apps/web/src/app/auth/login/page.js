"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoginPage;
/**
 * Login Page
 *
 * Simple authentication with Supabase
 * Spanish UI for LATAM market
 */
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const client_1 = require("@/lib/supabase/client");
const link_1 = __importDefault(require("next/link"));
function LoginPage() {
    const router = (0, navigation_1.useRouter)();
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const supabase = (0, client_1.createClient)();
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                setError(error.message);
                return;
            }
            // Create audit log
            await fetch('/api/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'LOGIN',
                    resource: 'Auth',
                    resourceId: data.user?.id || 'N/A',
                    userEmail: email,
                }),
            });
            router.push('/dashboard');
            router.refresh();
        }
        catch (err) {
            setError(err.message || 'Error al iniciar sesión');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="min-h-screen bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏥</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Holi Labs</h1>
          <p className="text-gray-600">Sistema de Salud Digital</p>
        </div>

        {/* Error Message */}
        {error && (<div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm">
              <span className="sr-only">Error: </span>
              {error}
            </p>
          </div>)}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition" placeholder="doctor@holilabs.com" autoComplete="email"/>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition" placeholder="••••••••" autoComplete="current-password"/>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">o</span>
          </div>
        </div>

        {/* Links */}
        <div className="text-center space-y-3">
          <link_1.default href="/auth/signup" className="block text-primary hover:text-primary/80 font-medium transition">
            ¿No tienes cuenta? Regístrate
          </link_1.default>
          <link_1.default href="/auth/reset-password" className="block text-sm text-gray-600 hover:text-gray-800 transition">
            ¿Olvidaste tu contraseña?
          </link_1.default>
        </div>

        {/* Demo Credentials */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-medium text-blue-900 mb-2">Demo:</p>
          <p className="text-xs text-blue-800">
            Email: doctor@holilabs.com<br />
            Password: 123456789
          </p>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map