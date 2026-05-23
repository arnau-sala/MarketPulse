export interface NetProfitHistoryMonth {
  month: string;
  monthNumber: number;
  netProfitGbp: number;
}

export interface NetProfitHistoryYear {
  year: number;
  months: NetProfitHistoryMonth[];
}

export const netProfitHistory: NetProfitHistoryYear[] = [
  { year: 2023, months: [
    { month: 'Jan', monthNumber: 1, netProfitGbp: 716452 },
    { month: 'Feb', monthNumber: 2, netProfitGbp: 1317737 },
    { month: 'Mar', monthNumber: 3, netProfitGbp: 1990977 },
    { month: 'Apr', monthNumber: 4, netProfitGbp: 1603757 },
    { month: 'May', monthNumber: 5, netProfitGbp: 1485133 },
    { month: 'Jun', monthNumber: 6, netProfitGbp: 2334834 },
    { month: 'Jul', monthNumber: 7, netProfitGbp: 1480454 },
    { month: 'Aug', monthNumber: 8, netProfitGbp: 2080513 },
    { month: 'Sep', monthNumber: 9, netProfitGbp: 1570863 },
    { month: 'Oct', monthNumber: 10, netProfitGbp: 1020954 },
    { month: 'Nov', monthNumber: 11, netProfitGbp: 1585501 },
    { month: 'Dec', monthNumber: 12, netProfitGbp: 1916714 },
  ] },
  { year: 2024, months: [
    { month: 'Jan', monthNumber: 1, netProfitGbp: 1106540 },
    { month: 'Feb', monthNumber: 2, netProfitGbp: 943406 },
    { month: 'Mar', monthNumber: 3, netProfitGbp: 780747 },
    { month: 'Apr', monthNumber: 4, netProfitGbp: 1009783 },
    { month: 'May', monthNumber: 5, netProfitGbp: 1536704 },
    { month: 'Jun', monthNumber: 6, netProfitGbp: 1024815 },
    { month: 'Jul', monthNumber: 7, netProfitGbp: 2500968 },
    { month: 'Aug', monthNumber: 8, netProfitGbp: 1503381 },
    { month: 'Sep', monthNumber: 9, netProfitGbp: 1059955 },
    { month: 'Oct', monthNumber: 10, netProfitGbp: 1868093 },
    { month: 'Nov', monthNumber: 11, netProfitGbp: 1583465 },
    { month: 'Dec', monthNumber: 12, netProfitGbp: 900497 },
  ] },
  { year: 2025, months: [
    { month: 'Jan', monthNumber: 1, netProfitGbp: 643769 },
    { month: 'Feb', monthNumber: 2, netProfitGbp: 982792 },
    { month: 'Mar', monthNumber: 3, netProfitGbp: 1114679 },
    { month: 'Apr', monthNumber: 4, netProfitGbp: 1741636 },
    { month: 'May', monthNumber: 5, netProfitGbp: 1925331 },
    { month: 'Jun', monthNumber: 6, netProfitGbp: 978410 },
    { month: 'Jul', monthNumber: 7, netProfitGbp: 2192231 },
    { month: 'Aug', monthNumber: 8, netProfitGbp: 1201160 },
    { month: 'Sep', monthNumber: 9, netProfitGbp: 1767384 },
    { month: 'Oct', monthNumber: 10, netProfitGbp: 1104668 },
    { month: 'Nov', monthNumber: 11, netProfitGbp: 1224950 },
    { month: 'Dec', monthNumber: 12, netProfitGbp: 1309456 },
  ] },
  { year: 2026, months: [
    { month: 'Jan', monthNumber: 1, netProfitGbp: 727381 },
    { month: 'Feb', monthNumber: 2, netProfitGbp: 1163806 },
    { month: 'Mar', monthNumber: 3, netProfitGbp: 2412899 },
    { month: 'Apr', monthNumber: 4, netProfitGbp: 2307883 },
  ] },
];
