'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Bell,
  Send,
  Save,
  RefreshCw,
  Sparkles,
  Smartphone,
  Check,
  ExternalLink,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useToast } from '@/components/Toast';

export default function SettingsPage() {
  // Password State
  const toast = useToast();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Push Notification Settings State
  const [pushConfig, setPushConfig] = useState({
    provider: 'EXPO',
    expoAccessToken: '',
    fcmServerKey: '',
    fcmProjectId: '',
    onesignalAppId: '',
    onesignalApiKey: '',
    isEnabled: true,
  });
  const [loadingPush, setLoadingPush] = useState(true);
  const [savingPush, setSavingPush] = useState(false);
  const [pushSaved, setPushSaved] = useState(false);

  // Test Push State
  const [testTitle, setTestTitle] = useState('ExamBondhuBD Test Ping 🔔');
  const [testBody, setTestBody] = useState('Your push notification credentials are valid and live!');
  const [testingPush, setTestingPush] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadPushConfig();
  }, []);

  async function loadPushConfig() {
    setLoadingPush(true);
    const res = await fetchApi('/notifications/admin/config');
    if (res.success && res.data) {
      setPushConfig({
        provider: res.data.provider || 'EXPO',
        expoAccessToken: res.data.expoAccessToken || '',
        fcmServerKey: res.data.fcmServerKey || '',
        fcmProjectId: res.data.fcmProjectId || '',
        onesignalAppId: res.data.onesignalAppId || '',
        onesignalApiKey: res.data.onesignalApiKey || '',
        isEnabled: res.data.isEnabled ?? true,
      });
    }
    setLoadingPush(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setSavingPassword(true);

    const res = await fetchApi('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });

    setSavingPassword(false);

    if (res.success) {
      setPasswordMessage({ type: 'success', text: 'Your administrator password has been updated successfully!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordMessage({
        type: 'error',
        text: res.message || 'Failed to update password. Please check your current password.',
      });
    }
  }

  async function handleSavePushConfig(e: React.FormEvent) {
    e.preventDefault();
    setSavingPush(true);
    setPushSaved(false);

    const res = await fetchApi('/notifications/admin/config', {
      method: 'POST',
      body: JSON.stringify(pushConfig),
    });

    setSavingPush(false);
    if (res.success) {
      setPushSaved(true);
      setTimeout(() => setPushSaved(false), 3500);
    } else {
      toast.error(res.message || 'Failed to save the push settings.');
    }
  }

  async function handleTestPush(e: React.FormEvent) {
    e.preventDefault();
    setTestingPush(true);
    setTestResult(null);

    const res = await fetchApi('/notifications/admin/test', {
      method: 'POST',
      body: JSON.stringify({ title: testTitle, body: testBody }),
    });

    setTestingPush(false);
    setTestResult({
      success: res.success,
      message: res.message || (res.success ? 'Push dispatched successfully!' : 'Failed to send test push'),
    });
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Banner Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System & Security Settings</h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Configure push notification gateways, API credentials, administrator security, and account passwords.
          </p>
        </div>
      </div>

      {/* Grid: Push Notification API Key Settings (Left/Center) & Password / Profile (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: PUSH NOTIFICATION API CONFIGURATION (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Push Notification API Credentials</h2>
                  <p className="text-xs text-slate-500">
                    Connect Expo Push Notification Service, Firebase Cloud Messaging (FCM), or OneSignal
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    pushConfig.isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                  }`}
                />
                <span className="text-xs font-bold text-slate-700">
                  {pushConfig.isEnabled ? 'Service Active' : 'Disabled'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSavePushConfig} className="space-y-5">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Primary Push Delivery Provider
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'EXPO', name: 'Expo Push Service', badge: 'Standard / Recommended' },
                    { id: 'FCM', name: 'Firebase FCM', badge: 'Google Cloud' },
                    { id: 'ONESIGNAL', name: 'OneSignal API', badge: 'REST Webhooks' },
                  ].map((prov) => (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => setPushConfig({ ...pushConfig, provider: prov.id })}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        pushConfig.provider === prov.id
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 text-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900">{prov.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{prov.badge}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Active Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Enable Push Notifications</div>
                  <div className="text-[11px] text-slate-500">
                    When disabled, the server will suppress outgoing push alerts to mobile devices.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={pushConfig.isEnabled}
                  onChange={(e) => setPushConfig({ ...pushConfig, isEnabled: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              {/* EXPO Credentials */}
              {pushConfig.provider === 'EXPO' && (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-50/60 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Expo Access Token (Optional / Recommended)</span>
                    <a
                      href="https://expo.dev/settings/access-tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      Expo Dashboard <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    placeholder="e.g. expo_access_token_xxxxxxxxxxxxxxxx"
                    value={pushConfig.expoAccessToken}
                    onChange={(e) => setPushConfig({ ...pushConfig, expoAccessToken: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Provides enhanced delivery rates, higher throughput, and authenticated access to Expo Push API.
                  </p>
                </div>
              )}

              {/* FCM Credentials */}
              {pushConfig.provider === 'FCM' && (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-50/60 border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Firebase Server Key / Service Account Private Key
                    </label>
                    <input
                      type="password"
                      placeholder="AAAAYyyyyyyyy:APA91b..."
                      value={pushConfig.fcmServerKey}
                      onChange={(e) => setPushConfig({ ...pushConfig, fcmServerKey: e.target.value })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Firebase Project ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. exambondhubd-prod"
                      value={pushConfig.fcmProjectId}
                      onChange={(e) => setPushConfig({ ...pushConfig, fcmProjectId: e.target.value })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* OneSignal Credentials */}
              {pushConfig.provider === 'ONESIGNAL' && (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-50/60 border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      OneSignal App ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5eb5a37e-b458-11e3-ac11-000c2940e62c"
                      value={pushConfig.onesignalAppId}
                      onChange={(e) => setPushConfig({ ...pushConfig, onesignalAppId: e.target.value })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      OneSignal REST API Key
                    </label>
                    <input
                      type="password"
                      placeholder="Basic os_api_key_xxxxxxxx"
                      value={pushConfig.onesignalApiKey}
                      onChange={(e) => setPushConfig({ ...pushConfig, onesignalApiKey: e.target.value })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Save Push Button */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingPush}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-sm shadow-indigo-600/20 flex items-center gap-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {savingPush ? 'Saving API Credentials...' : 'Save Push Configuration'}
                </button>

                {pushSaved && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4" /> Credentials Saved in Database!
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* TEST PUSH NOTIFICATION CARD */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Verify Push Gateway with Test Ping</h3>
                <p className="text-xs text-slate-500">
                  Sends a real-time push test using your saved API credentials to check delivery.
                </p>
              </div>
            </div>

            <form onSubmit={handleTestPush} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Notification Title"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                />
                <input
                  type="text"
                  required
                  placeholder="Notification Body"
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  Target: <strong>All registered device push tokens</strong>
                </span>

                <button
                  type="submit"
                  disabled={testingPush}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-2xl flex items-center gap-2 transition-all"
                >
                  <Send className={`w-3.5 h-3.5 ${testingPush ? 'animate-spin' : ''}`} />
                  {testingPush ? 'Dispatching Test...' : 'Send Live Test Ping'}
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: PASSWORD CHANGE & ADMIN PROFILE (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Admin Profile Details */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">Administrator Credentials</h2>
                <p className="text-xs text-slate-500">Current authenticated session details</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Email ID</span>
                <span className="font-black text-slate-900">admin@exambondhubd.com</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Access Role</span>
                <span className="font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[11px]">
                  SUPER_ADMIN
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Security Status</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live & Protected
                </span>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">Update Password</h2>
                <p className="text-xs text-slate-500">Change your administrator console login password</p>
              </div>
            </div>

            {passwordMessage && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
                  passwordMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {passwordMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
              {/* Old Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    required
                    placeholder="Enter current password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:bg-white focus:border-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Password (Min 6 Characters) *
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    placeholder="Enter at least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:bg-white focus:border-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-sm transition-all"
                >
                  {savingPassword ? 'Updating Password...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
