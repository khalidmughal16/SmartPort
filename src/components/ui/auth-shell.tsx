'use client'
import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

/** Full-screen page background from sign-in-card-2, with the SmartPort landing-page photo and lime glows. */
export function AuthShell({ image, children }: { image: string; children: React.ReactNode }) {
  return (
    <div className="tw-root min-h-screen w-full bg-black relative overflow-hidden flex items-center justify-center py-10 px-4">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black" />
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vh] h-[60vh] rounded-b-[50%] bg-lime-300/20 blur-[80px]" />
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vh] h-[60vh] rounded-b-full bg-lime-200/20 blur-[60px]"
        animate={{ opacity: [0.15, 0.3, 0.15], scale: [0.98, 1.02, 0.98] }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "mirror" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90vh] h-[90vh] rounded-t-full bg-lime-300/20 blur-[60px]"
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, repeatType: "mirror", delay: 1 }}
      />
      <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-white/5 rounded-full blur-[100px] animate-pulse opacity-40" />
      <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-white/5 rounded-full blur-[100px] animate-pulse opacity-40" />
      <Link to="/" className="absolute top-5 left-6 z-20 text-white text-xl font-semibold" style={{ fontFamily: "Fraunces, Georgia, serif" }}>
        SmartPort<span className="text-lime-300">.</span>
      </Link>
      <Link to="/" className="absolute top-6 right-6 z-20 text-xs text-white/60 hover:text-white transition-colors">&larr; Back to home</Link>
      {children}
    </div>
  );
}

export function CardHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="text-center space-y-1 mb-5">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="mx-auto w-10 h-10 rounded-full border border-white/10 flex items-center justify-center relative overflow-hidden"
      >
        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">S</span>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
        {title}
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-white/60 text-xs">
        {sub}
      </motion.p>
    </div>
  );
}

export function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full relative group/button mt-5">
      <div className="absolute inset-0 bg-lime-300/20 rounded-lg blur-lg opacity-0 group-hover/button:opacity-70 transition-opacity duration-300" />
      <div className="relative overflow-hidden bg-lime-300 text-black font-medium h-10 rounded-lg transition-all duration-300 flex items-center justify-center">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0 -z-0"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
          style={{ opacity: loading ? 1 : 0, transition: 'opacity 0.3s ease' }}
        />
        {loading ? (
          <div className="w-4 h-4 border-2 border-black/70 border-t-transparent rounded-full animate-spin relative" />
        ) : (
          <span className="relative flex items-center justify-center gap-1 text-sm font-medium">{label}</span>
        )}
      </div>
    </motion.button>
  );
}

export const FormError = ({ msg }: { msg: string }) =>
  msg ? <p role="alert" className="text-xs text-red-400 -mt-1">{msg}</p> : null;
