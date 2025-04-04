import React from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const Header = () => {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#f5f5f5' }}>
      <nav>
        <ul style={{ display: 'flex', listStyle: 'none', gap: '1rem', margin: 0, padding: 0 }}>
          <li><Link href="/">Home</Link></li>
          <li><Link href="/user/create">create</Link></li>
          <li><Link href="/admin/cookie-jars">Cookie Jars</Link></li>
        </ul>
      </nav>
      <ConnectButton />
    </header>
  );
};

export default Header;
