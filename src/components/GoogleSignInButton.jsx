'use client';

import { useEffect, useRef, useState } from 'react';

const FALLBACK_CLIENT_ID = '65577393621-f3j8flje270cd6d834foanh7cvelhc16.apps.googleusercontent.com';

/**
 * Robust Google Identity Services Button component.
 * Works seamlessly in both local and production (Vercel) builds.
 */
export default function GoogleSignInButton({ onSuccess, onError, text = 'signin_with', width = 360 }) {
  const btnContainerRef = useRef(null);
  const [isClient, setIsClient] = useState(false);
  const [loadingScript, setLoadingScript] = useState(true);

  // Read environment variable with reliable fallback
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || FALLBACK_CLIENT_ID;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !clientId) return;

    let isMounted = true;

    const renderGoogleBtn = () => {
      if (!isMounted) return;
      if (window.google?.accounts?.id && btnContainerRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (response?.credential) {
                onSuccess?.(response);
              } else {
                onError?.();
              }
            },
          });

          btnContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(btnContainerRef.current, {
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            width: typeof width === 'number' ? width : parseInt(width, 10) || 360,
            text,
          });
          setLoadingScript(false);
        } catch (err) {
          console.error('Error rendering Google Sign-in button:', err);
          setLoadingScript(false);
        }
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleBtn();
      return;
    }

    // Check if script is already added in head/body
    let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        renderGoogleBtn();
      };
      script.onerror = () => {
        console.error('Failed loading Google Identity script');
        setLoadingScript(false);
        onError?.();
      };
      document.head.appendChild(script);
    } else {
      const prevOnload = script.onload;
      script.onload = () => {
        if (typeof prevOnload === 'function') prevOnload();
        renderGoogleBtn();
      };
      // If already loaded in background
      if (window.google?.accounts?.id) {
        renderGoogleBtn();
      }
    }

    return () => {
      isMounted = false;
    };
  }, [isClient, clientId, onSuccess, onError, text, width]);

  if (!isClient) {
    return (
      <div className="flex justify-center w-full min-h-[44px]">
        <div className="h-10 w-[360px] max-w-full rounded-full bg-zinc-900 animate-pulse border border-white/10" />
      </div>
    );
  }

  return (
    <div className="flex justify-center w-full min-h-[44px]">
      <div ref={btnContainerRef} className="flex justify-center" />
      {loadingScript && !btnContainerRef.current?.children?.length && (
        <div className="h-10 w-[360px] max-w-full rounded-full bg-zinc-900 animate-pulse border border-white/10 flex items-center justify-center text-xs text-zinc-500">
          Loading Google Sign-in...
        </div>
      )}
    </div>
  );
}
