export interface PaymentEntry {
  _id: string;
  date: string;
  type: 'interest' | 'partial' | 'full';
  amountPaid: number;
  principalReduced: number;
  interestPaid: number;
  facePhotoUrl?: string;
  jewelleryPhotoUrl?: string;
  discount?: number;
  processedByName?: string;
}

export interface IClient {
  _id: string;
  serialNumber: number;
  glNumber?: string;
  name: string;
  contactNumber: string;
  jewelleryDetails: string;
  goldWeight: number;
  goldWeightGross?: number;
  goldWeightNet?: number;
  pawnAmount: number;
  interestRate?: number;
  pawnDate: string;
  expectedReturnDate: string;
  facePhotoUrl?: string;
  kycDocumentUrl?: string;
  kycBackDocumentUrl?: string;
  jewelleryPhotoUrl?: string;
  closingFacePhotoUrl?: string;
  closingJewelleryPhotoUrl?: string;
  status: 'active' | 'closed';
  closedDate?: string;
  totalAmountPaid?: number;
  payments: PaymentEntry[];
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalActive: number;
  totalPawnAmount: number;
  overdueCount: number;
  totalClosed: number;
  todayNewCount: number;
  todayClosedCount: number;
}

export interface IUser {
  _id: string;
  username: string;
  name: string;
  role: 'admin' | 'employee';
  createdAt: string;
}

export interface IAuditLog {
  _id: string;
  action: string;
  performedByName: string;
  glNumber?: string;
  clientName?: string;
  amount?: number;
  details?: string;
  createdAt: string;
}

export interface ITransaction {
  _id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  tag: string;
  description?: string;
  recordedByName?: string;
  createdAt: string;
}

export interface CashflowDay {
  date: string; // YYYY-MM-DD IST
  loansOut: number;
  collectionsIn: number;
  otherIncome: number;
  otherExpenses: number;
  net: number;
}

export interface CashflowSummary {
  initialBalance: number;
  runningBalance: number;
  period: {
    loansOut: number;
    collectionsIn: number;
    pawnNet: number;
    otherIncome: number;
    otherExpenses: number;
    otherNet: number;
    totalNet: number;
  };
  days: CashflowDay[];
  transactions: ITransaction[];
}

export interface DailyReport {
  date: string;
  dateLabel?: string;
  isRange?: boolean;
  newLoans: IClient[];
  closedLoans: IClient[];
  totalNewPrincipal: number;
  totalCollected: number;
  totalInterestCollected: number;
  totalPrincipalFromClosures: number;
  totalInterestFromClosures: number;
  newCount: number;
  closedCount: number;
}
