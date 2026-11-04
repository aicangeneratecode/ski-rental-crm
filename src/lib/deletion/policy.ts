/** A booking can be removed only after its operational lifecycle has ended. */
export function isDeletableBookingStatus(status: string): boolean {
  return status === "RETURNED" || status === "CANCELLED";
}
