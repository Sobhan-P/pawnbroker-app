export interface IClient {
  _id: string;
  serialNumber: number;
  name: string;
  contactNumber: string;
  jewelleryDetails: string;
  goldWeight: number;
  pawnAmount: number;
  interestRate: number;
  pawnDate: string;
  expectedReturnDate: string;
  facePhotoUrl?: string;
  kycDocumentUrl?: string;
  jewelleryPhotoUrl?: string;
  status: 'active' | 'closed';
  closedDate?: string;
  totalAmountPaid?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalActive: number;
  totalPawnAmount: number;
  overdueCount: number;
  totalClosed: number;
}
