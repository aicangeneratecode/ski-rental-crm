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
    reservations: {
      startDate: string;
      endDate: string;
    }[];
  };
  
  export type BookingRow = {
    id: string;
    version: number;
    customerName: string;
    customerPhone: string;
    startDate: string;
    endDate: string;
    status: "RESERVED" | "ISSUED" | "RETURNED" | "CANCELLED";
    paidDays: number;
    total: number;
    notes: string;
    items: {
      id: string;
      code: string;
      name: string;
      complimentary: boolean;
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