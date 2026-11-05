import type { BookingCustomer } from "./types";

/** Search a few hundred customers without relying on listbox scrolling. */
export function searchBookingCustomers(
  customers: BookingCustomer[],
  query: string,
): BookingCustomer[] {
  const terms = query.toLocaleLowerCase("ru").trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return customers;

  return customers.filter((customer) => {
    const name = customer.name.toLocaleLowerCase("ru").replace(/ё/g, "е");
    const digits = customer.phone.replace(/\D/g, "");
    const phoneVariants = digits.startsWith("381")
      ? [digits, `0${digits.slice(3)}`]
      : digits.startsWith("0")
        ? [digits, `381${digits.slice(1)}`]
        : [digits];

    return terms.every((term) => {
      const normalized = term.replace(/ё/g, "е");
      if (name.includes(normalized)) return true;
      const termDigits = term.replace(/\D/g, "");
      return termDigits.length >= 3
        && phoneVariants.some((variant) => variant.includes(termDigits));
    });
  });
}
