export function orderStatusColors(status: string | null | undefined) {
  const normalized = (status || '').trim().toLowerCase();

  if (normalized === 'waiting_payment' || normalized === 'waiting for payment') {
    return {
      backgroundColor: '#F7E3EB',
      textColor: '#A03C62',
    };
  }

  if (normalized === 'pending_shipment' || normalized === 'pending shipment') {
    return {
      backgroundColor: '#E3EFFB',
      textColor: '#2E68A2',
    };
  }

  if (normalized === 'shipped' || normalized === 'completed') {
    return {
      backgroundColor: '#E3F3E7',
      textColor: '#2F7A46',
    };
  }

  return {
    backgroundColor: '#E8F0F7',
    textColor: '#0E4A72',
  };
}
