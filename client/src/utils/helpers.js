// Format currency in LKR
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'Rs. 0.00';
  return 'Rs. ' + parseFloat(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Format date
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Format date-time
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Days remaining
export const daysRemaining = (dateStr) => {
  if (!dateStr) return 0;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Get status badge class
export const getStatusBadge = (status) => {
  const map = {
    active: 'badge-primary', completed: 'badge-success', overdue: 'badge-danger',
    cancelled: 'badge-gray', pending: 'badge-warning', paid: 'badge-success',
    partial: 'badge-info', open: 'badge-warning', in_progress: 'badge-info',
    resolved: 'badge-success', rejected: 'badge-danger', claimed: 'badge-warning',
    expired: 'badge-danger',
  };
  return map[status] || 'badge-gray';
};

export const today = () => new Date().toISOString().split('T')[0];

export const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ') : '';
