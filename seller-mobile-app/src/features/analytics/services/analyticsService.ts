export interface ChartDataPoint {
  date: string;
  revenue: number;
}

export const analyticsService = {
  transformRevenueData: (revenueObj: Record<string, number>): ChartDataPoint[] => {
    if (!revenueObj) return [];
    return Object.entries(revenueObj)
      .map(([key, val]) => {
        let label = key;
        try {
          const date = new Date(key);
          if (!isNaN(date.getTime())) {
            label = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          }
        } catch {
          // ignore
        }
        return {
          date: label,
          revenue: val,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },
};
