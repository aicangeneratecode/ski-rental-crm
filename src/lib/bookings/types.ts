export type BookingCustomer = {
    id: string;
    name: string;
    phone: string;
  };
  
  export type BookingEquipment = {
    id: string;
    code: string;
    name: string;
    size: string;
    dailyRate: number;
    tariff: string;
    status?: string;
    reservations: {
      startDate: string;
      endDate: string;
      bookingId?: string;
    }[];
  };
  
  export type BookingRow = {
    id: string;
    version: number;
    customerId?: string;
    customerName: string;
    customerPhone: string;
    startDate: string;
    endDate: string;
    status: "RESERVED" | "ISSUED" | "RETURNED" | "CANCELLED";
    paidDays: number;
    total: number;
    notes: string;
    travelDay: boolean;
    discountPercent: number;
    subtotal: number;
    discountAmount: number;
    items: {
      id: string;
      equipmentId?: string;
      code: string;
      name: string;
      complimentary: boolean;
      dailyRate: number;
      amount: number;
    }[];
  };
  
  export function formatBookingMoney(value: number) {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RSD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  
  export function formatBookingDate(value: string) {
    return value.split("-").reverse().join(".");
  }