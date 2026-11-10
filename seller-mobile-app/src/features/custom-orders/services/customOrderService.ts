export const customOrderService = {
  formatSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  getStatusBadgeVariant: (status: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' => {
    switch (status.toUpperCase()) {
      case 'UNDER_REVIEW':
        return 'secondary';
      case 'QUOTED':
      case 'ACCEPTED':
        return 'success';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'default';
    }
  },
};
