'use client';

import { Menu } from 'lucide-react';
import React from 'react';

export default function MobileMenuToggle() {
  return (
    <button
      className="mobile-menu-toggle"
      onClick={() => window.dispatchEvent(new CustomEvent('toggleSidebar'))}
      aria-label="Toggle sidebar"
    >
      <Menu size={24} />
    </button>
  );
}
