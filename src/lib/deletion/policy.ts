/** Only closed or cancelled rentals may be archived or restored. */
export function canArchiveBookingStatus(status: string): boolean {
  return status === "RETURNED" || status === "CANCELLED";
}
