/**
 * 🌐 ÉCOUTE RÉSEAU
 * Détecte online/offline et sync automatiquement
 */

import { useEffect, useState } from 'react';
import * as Network from 'expo-network';
import { syncQueue } from '../services/syncQueue';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkNetwork = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (mounted) {
          const online = state.isConnected ?? true;
          setIsOnline(online);
          syncQueue.setOnlineStatus(online);
        }
      } catch (error) {
        console.error('[network]:', error);
      }
    };

    // Check initial
    checkNetwork();

    // Subscribe to changes
    const subscription = Network.addNetworkStateListener(({ isConnected }) => {
      if (mounted) {
        const online = isConnected ?? true;
        setIsOnline(online);
        syncQueue.setOnlineStatus(online);
      }
    });

    return () => {
      mounted = false;
      subscription();
    };
  }, []);

  return { isOnline };
}
