'use client';

import { useEffect, useRef } from 'react';

/**
 * Standard Google Identity Services Script loader & button renderer.
 * Native zero-dependency Google Sign-In for React 19 & Next.js.
 */
export default function GoogleSignInButton({ onSuccess, onError, text = 'signin_with', width = 360 }) {
  const btnContainerRef = useRef(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      console.warn('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured');
      return;
    }

    const initializeGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              onSuccess?.(response);
            } else {
              onError?.();
            }
          },
        });

        if (btnContainerRef.current) {
          btnContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(btnContainerRef.current, {
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            width: typeof width === 'number' ? width : parseInt(width, 10) || 360,
            text,
          });
        }
      }
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    document.body.appendChild(script);

    return () => {
      // clean up if needed
    };
  }, [clientId, onSuccess, onError, text, width]);

  if (!clientId) {
    return null;
  }

  return (
    <div className="flex justify-center w-full min-h-[44px]">
      <div ref={btnContainerRef} className="flex justify-center" />
    </div>
  );
}
