export const DEMO_CONFIG = {
  DEMO_MODE: true,
  APP_NAME: 'CARS24 AI Assistant',
  APP_VERSION: '2.4.0 (Enterprise Demo)',
  SAFETY_NOTICE: 'DEMO ONLY – No real action performed. This application operates entirely with synthetic data in the browser.',
  BANNER_MESSAGE: 'DEMO MODE: This is a simulated experience. No real bookings, calls, emails or WhatsApp messages are being sent.',
  CHANNELS: ['RETAIL', 'AUCTION', 'LOANS'],
  ALLOW_EXTERNAL_CALLS: false,
  DEFAULT_SIMULATED_DELAY_MS: 600,
};

export function logDemoAction(actionType: string, summary: string, metadata?: Record<string, any>) {
  if (typeof window !== 'undefined') {
    const existing = JSON.parse(localStorage.getItem('maruti_demo_activity') || '[]');
    const newEntry = {
      id: 'ACT-' + Date.now().toString(36).toUpperCase(),
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      actionType,
      title: summary,
      details: metadata?.details || 'Local simulated action without external API trigger',
      metadata
    };
    localStorage.setItem('maruti_demo_activity', JSON.stringify([newEntry, ...existing.slice(0, 49)]));
    window.dispatchEvent(new CustomEvent('maruti_demo_activity_updated'));
  }
}
