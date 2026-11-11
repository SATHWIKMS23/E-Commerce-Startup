'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

interface GoogleButtonProps {
  label?: string;
  onError?: (msg: string) => void;
}

export function GoogleButton({ label = 'Continue with Google', onError }: GoogleButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await signIn('google', {
        callbackUrl: '/dashboard',
        redirect: true,
      });

      if (result?.error) {
        throw new Error(result.error);
      }
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (onError) {
        onError(err?.message || 'Failed to initiate Google Sign In.');
      }
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={loading}
      className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-sm font-medium text-white/70 hover:text-white/95 hover:bg-white/[0.07] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:border-purple-500/30 active:scale-[0.99]"
    >
      {loading ? (
        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      ) : (
        <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.107C18.29 1.94 15.5 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.985 0-.74-.08-1.305-.178-1.785H12.24z"
          />
        </svg>
      )}
      <span>{loading ? 'Redirecting to Google...' : label}</span>
    </button>
  );
}
