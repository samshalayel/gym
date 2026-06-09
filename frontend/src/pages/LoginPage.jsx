import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import AuthLayout from '../layouts/AuthLayout'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const isRtl = locale === 'ar'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await login(form.username, form.password)
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('role', res.data.role)
      localStorage.setItem('username', res.data.username || '')
      if (res.data.member_id) localStorage.setItem('member_id', res.data.member_id)

      const target = res.data.role === 'member' ? '/member-portal' : '/'
      toast(res.data.role === 'member' ? 'مرحباً بك في بوابة العضو' : 'Welcome back!', 'success')
      navigate(target)
    } catch {
      toast(t('auth.invalid'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit}>
        <div style={s.field}>
          <label style={s.label}>{t('auth.username')}</label>
          <input
            style={s.input}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
        </div>
        <div style={s.field}>
          <label style={s.label}>{t('auth.password')}</label>
          <input
            type="password"
            style={s.input}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <button type="submit" style={s.btn} disabled={loading}>
          {loading ? (
            <span style={s.loadingWrap}>
              <span style={s.spinner} />
            </span>
          ) : t('auth.signIn')}
        </button>
      </form>
    </AuthLayout>
  )
}

const s = {
  field: { marginBottom: 20 },
  label: {
    display: 'block',
    marginBottom: 8,
    fontSize: 12,
    color: '#6b6b80',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    fontSize: 15,
    color: '#e8e8f0',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  btn: {
    width: '100%',
    padding: 14,
    background: '#00f5d4',
    color: '#08080e',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    cursor: 'pointer',
    fontWeight: 700,
    marginTop: 8,
    letterSpacing: '0.5px',
    transition: 'all 0.2s',
  },
  loadingWrap: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  spinner: {
    width: 18,
    height: 18,
    border: '2px solid rgba(0,0,0,0.15)',
    borderTopColor: '#08080e',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
}
