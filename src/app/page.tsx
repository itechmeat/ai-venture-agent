'use client';

import React from 'react';
import { StartupList } from '@/components';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Starfield background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(2px 2px at 20px 30px, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(2px 2px at 40px 70px, rgba(100, 255, 218, 0.8), transparent),
            radial-gradient(1px 1px at 90px 40px, rgba(255, 255, 255, 0.6), transparent),
            radial-gradient(1px 1px at 130px 80px, rgba(124, 77, 255, 0.8), transparent),
            radial-gradient(2px 2px at 160px 30px, rgba(255, 255, 255, 0.4), transparent),
            radial-gradient(1px 1px at 200px 60px, rgba(255, 64, 129, 0.8), transparent),
            radial-gradient(1px 1px at 240px 90px, rgba(255, 255, 255, 0.7), transparent),
            radial-gradient(2px 2px at 280px 20px, rgba(100, 255, 218, 0.6), transparent)
          `,
          backgroundRepeat: 'repeat',
          backgroundSize: '300px 150px',
          animation: 'starfield 30s linear infinite',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <StartupList />
      </div>

      <style jsx>{`
        @keyframes starfield {
          0% {
            transform: translateY(0px) translateX(0px);
          }
          100% {
            transform: translateY(-150px) translateX(-300px);
          }
        }
      `}</style>
    </main>
  );
}
