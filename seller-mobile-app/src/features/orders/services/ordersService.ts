export const ordersService = {
  getStatusColor: (status: string): 'default' | 'success' | 'destructive' | 'secondary' | 'outline' => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'default';
      case 'ACCEPTED':
      case 'PROCESSING':
        return 'secondary';
      case 'PACKED':
        return 'outline';
      case 'SHIPPED':
        return 'success';
      case 'DELIVERED':
        return 'success';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'outline';
    }
  },

  formatDate: (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  },
};
