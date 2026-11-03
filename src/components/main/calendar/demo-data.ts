export type CalendarEquipment = {
    id: string;
    code: string;
    name: "skis" | "extremeSkis" | "board" | "boots" | "helmet";
    size: string;
  };
  
  export type CalendarEntry = {
    id: string;
    equipmentId: string;
    customer: string;
    startDate: string;
    endDate: string;
    status: "reserved" | "issued" | "maintenance";
  };
  
  export const demoEquipment: CalendarEquipment[] = [
    { id: "ski-1", code: "SKI-001", name: "skis", size: "170" },
    { id: "ski-2", code: "SKI-002", name: "extremeSkis", size: "178" },
    { id: "board-1", code: "BRD-001", name: "board", size: "156" },
    { id: "boots-1", code: "BTS-001", name: "boots", size: "42" },
    { id: "helmet-1", code: "HLM-001", name: "helmet", size: "M" },
  ];
  
  export const demoEntries: CalendarEntry[] = [
    {
      id: "DEMO-101",
      equipmentId: "ski-1",
      customer: "Мария Иванова",
      startDate: "2027-01-11",
      endDate: "2027-01-14",
      status: "issued",
    },
    {
      id: "DEMO-102",
      equipmentId: "ski-1",
      customer: "Александр Петров",
      startDate: "2027-01-16",
      endDate: "2027-01-19",
      status: "reserved",
    },
    {
      id: "DEMO-103",
      equipmentId: "ski-2",
      customer: "",
      startDate: "2027-01-12",
      endDate: "2027-01-13",
      status: "maintenance",
    },
    {
      id: "DEMO-104",
      equipmentId: "board-1",
      customer: "Никола Јовановић",
      startDate: "2027-01-14",
      endDate: "2027-01-18",
      status: "reserved",
    },
    {
      id: "DEMO-105",
      equipmentId: "boots-1",
      customer: "Мария Иванова",
      startDate: "2027-01-11",
      endDate: "2027-01-14",
      status: "issued",
    },
  ];