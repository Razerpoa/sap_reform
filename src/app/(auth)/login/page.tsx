"use client";

import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="flex justify-center">
          <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
            <LogIn className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="mt-10 text-center text-3xl font-bold leading-9 tracking-tight text-slate-900">
          SAP REFORM
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Pelacak aman untuk operasi harian
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="bg-white px-8 py-10 shadow-xl shadow-slate-200 rounded-3xl border border-slate-100">
          <p className="text-center text-sm font-medium text-slate-700 mb-8">
            Akses terbatas untuk pengguna yang diizinkan
          </p>
          
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:ring-transparent transition-all active:scale-[0.98]"
          >
            <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
              <path
                d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21028 6.86502 8.86528 4.75 12.0003 4.75Z"
                fill="#EA4335"
              />
              <path
                d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.925 23.49 12.275Z"
                fill="#4285F4"
              />
              <path
                d="M5.26498 14.2949C5.02498 13.565 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.435 5.26498 9.70493L1.27539 6.60986C0.460391 8.22986 0 10.0599 0 11.9999C0 13.9399 0.460391 15.7699 1.27539 17.3899L5.26498 14.2949Z"
                fill="#FBBC05"
              />
              <path
                d="M12.0003 24C15.2403 24 17.9653 22.935 19.9453 21.095L16.0803 18.095C15.0053 18.82 13.6203 19.25 12.0003 19.25C8.86528 19.25 6.21028 17.135 5.27028 14.295L1.28027 17.39C3.25527 21.31 7.31028 24 12.0003 24Z"
                fill="#34A853"
              />
            </svg>
            Lanjutkan dengan Google
          </button>
        </div>
        
        <p className="mt-10 text-center text-xs text-slate-400">
          &copy; 2026 SAP REFORM Team. All rights reserved.
        </p>
      </div>
    </div>
  );
}
