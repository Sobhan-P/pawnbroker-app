export interface PaymentEntry {
  _id: string;
  date: string;
  type: 'interest' | 'partial' | 'full';
  amountPaid: number;
  principalReduced: number;
  interestPaid: number;
  facePhotoUrl?: string;
  jewelleryPhotoUrl?: string;
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

export interface DailyReport {
  date: string;
  newLoans: IClient[];
  closedLoans: IClient[];
  totalNewPrincipal: number;
  totalCollected: number;
  totalInterestCollected: number;
  newCount: number;
  closedCount: number;
}
