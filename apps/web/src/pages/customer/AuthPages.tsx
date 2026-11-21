import React, { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const AuthFrame: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <main className="mx-auto max-w-md px-4 py-16">
    <div className="rounded-3xl border border-dark-800 bg-dark-900 p-7 shadow-2xl sm:p-9">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-400">FlashStock account</p>
      <h1 className="mb-6 text-2xl font-bold text-white">{title}</h1>
      {children}
    </div>
  </main>
)

const postLoginDestination = (role: string, requestedPath?: string) => {
  const safePath = requestedPath && requestedPath.startsWith('/') && !requestedPath.startsWith('//')
    ? requestedPath
    : undefined
  if (role.toLowerCase() === 'admin') {
    return safePath?.startsWith('/admin') ? safePath : '/admin'
  }
  return safePath || '/account'
}

export const LoginPage: React.FC = () => {
  const { user, isLoading: isChecking, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const from = (location.state as { from?: string } | null)?.from

  if (isChecking) return <AuthFrame title="Sign in"><p className="text-sm text-gray-400">Checking your session…</p></AuthFrame>
  if (user) return <Navigate to={postLoginDestination(user.role, from)} replace />

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const authenticatedUser = await login(email, password)
      navigate(postLoginDestination(authenticatedUser.role, from), { replace: true })
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in') }
    finally { setBusy(false) }
  }

  return <AuthFrame title="Welcome back">
    <form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}
      <label className="block text-sm text-gray-300">Email<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-dark-700 bg-dark-950 px-3 py-2.5 text-white outline-none focus:border-amber-500" /></label>
      <label className="block text-sm text-gray-300">Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-dark-700 bg-dark-950 px-3 py-2.5 text-white outline-none focus:border-amber-500" /></label>
      <button disabled={busy} className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-dark-950 disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button>
      <p className="text-center text-sm text-gray-400">New to FlashStock? <Link className="text-amber-400 hover:underline" to="/register">Create an account</Link></p>
    </form>
  </AuthFrame>
}

export const RegisterPage: React.FC = () => {
  const { user, isLoading: isChecking, register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (isChecking) return <AuthFrame title="Create account"><p className="text-sm text-gray-400">Checking your session…</p></AuthFrame>
  if (user) return <Navigate to="/account" replace />

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await register(name, email, password); navigate('/account', { replace: true }) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to create your account') }
    finally { setBusy(false) }
  }
  return <AuthFrame title="Create your account">
    <form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}
      <label className="block text-sm text-gray-300">Name<input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-dark-700 bg-dark-950 px-3 py-2.5 text-white outline-none focus:border-amber-500" /></label>
      <label className="block text-sm text-gray-300">Email<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-dark-700 bg-dark-950 px-3 py-2.5 text-white outline-none focus:border-amber-500" /></label>
      <label className="block text-sm text-gray-300">Password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-dark-700 bg-dark-950 px-3 py-2.5 text-white outline-none focus:border-amber-500" /><span className="mt-1 block text-xs text-gray-500">Use at least 8 characters.</span></label>
      <button disabled={busy} className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-dark-950 disabled:opacity-50">{busy ? 'Creating account…' : 'Create account'}</button>
      <p className="text-center text-sm text-gray-400">Already registered? <Link className="text-amber-400 hover:underline" to="/login">Sign in</Link></p>
    </form>
  </AuthFrame>
}
