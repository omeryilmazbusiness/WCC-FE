export type BookingStatus = "draft" | "confirmed" | "cancelled" | "completed";

export type Booking = {
  id: string;
  status: BookingStatus;
  paxCount: number;
  totalAmount: number;
  balanceAmt: number;
  currency: string;
};
