import clauses from "@/lib/agreements/template.json";
import {
  agreementDate,
  rentalCalendarDays,
  type AgreementBooking,
  type AgreementFields,
} from "@/lib/agreements/types";

interface Props {
  booking: AgreementBooking;
  fields: AgreementFields;
}
const blank = "________________________________";
const money = (value: number) =>
  new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value);

export default function AgreementDocument({ booking, fields }: Props) {
  return (
    <article className="agreement-document" lang="en">
      <section className="agreement-page">
        <h1>Accession Agreement</h1>
        <h2>Agreement No. {fields.number || blank}</h2>
        <p className="agreement-center">
          on joining the Rental Agreement for Sports Equipment (rental rules) by
          Individual Entrepreneur Grigori Sapozhnikov PR FORTISBP
        </p>
        <div className="agreement-meta">
          <span>City of Belgrade</span>
          <span>{agreementDate(fields.date)}</span>
        </div>
        <p>
          The &quot;Lessor,&quot; acting on the basis of the Charter, on one
          side, and <strong>{fields.fullName || blank}</strong>, passport No.{" "}
          <strong>{fields.passportNumber || blank}</strong>, issued by{" "}
          <strong>{fields.passportIssuer || blank}</strong>, date of issue{" "}
          <strong>{agreementDate(fields.passportDate)}</strong>, referred to
          hereinafter as the &quot;Lessee,&quot; on the other side, collectively
          referred to as the &quot;Parties,&quot; have entered into this
          agreement on the following terms:
        </p>
        {clauses.map((clause) => (
          <p key={clause}>{clause}</p>
        ))}
      </section>
      <section className="agreement-page agreement-appendix">
        <h2>
          Appendix No. 1 to the Accession Agreement to the Rental Agreement for
          Sports Equipment
        </h2>
        <p className="agreement-center">
          Agreement No. {fields.number || blank} · {agreementDate(fields.date)}
        </p>
        <h1>ACT</h1>
        <h2>Acceptance and Transfer of Sports Equipment</h2>
        <p>
          1. The Lessor has provided for use, and the Lessee has accepted the
          following property (hereinafter referred to as the
          &quot;equipment&quot;) at its book value:
        </p>
        <table>
          <thead>
            <tr>
              <th>Equipment/Service</th>
              <th>Price per Unit/Day (RSD)</th>
              <th>Quantity</th>
              <th>Discount</th>
              <th>Amount* (RSD)</th>
            </tr>
          </thead>
          <tbody>
            {booking.items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.name}
                  <br />
                  <small>{item.code}</small>
                </td>
                <td>{money(item.dailyRate)}</td>
                <td>1</td>
                <td>{item.complimentary ? "100%" : "—"}</td>
                <td>{money(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="agreement-calculation">
          * Amount for {booking.paidDays} paid day(s), before the booking
          discount. Subtotal: {money(booking.subtotal)} RSD. Booking discount
          {booking.discountPercent ? ` (${booking.discountPercent}%)` : ""}:{" "}
          {money(booking.discountAmount)} RSD.
          {booking.travelDay
            ? " A free travel day is included in the rental period and excluded from the paid days."
            : ""}
        </p>
        <p>
          1. The equipment is provided for the period from{" "}
          <strong>{agreementDate(booking.startDate)}</strong> to{" "}
          <strong>{agreementDate(booking.endDate)}</strong>.
        </p>
        <p>
          2. Equipment is provided for{" "}
          <strong>
            {rentalCalendarDays(booking.startDate, booking.endDate)}
          </strong>{" "}
          days.
        </p>
        <p>
          3. The rental cost of the equipment is:{" "}
          <strong>{money(booking.total)}</strong> dinars.
        </p>
        <p>
          4. The equipment has been thoroughly inspected and accepted by the
          Lessee in terms of quality and quantity.
        </p>
        <p>5. The Parties have no mutual comments or claims.</p>
        <p>
          6. This Act is drawn up in two copies, one for each of the Parties.
        </p>
        <div className="agreement-signatures">
          <p>7. Signatures of the parties:</p>
          <div className="agreement-signature-grid">
            <div>
              <strong>Lessor:</strong>
              <p>
                Individual Entrepreneur Grigori Sapozhnikov PR FORTISBP
                <br />
                TIN: 114122964
              </p>
              <p>Legal Address: Iva Lola Ribara 234, Backa Palanka, Serbia</p>
              <div className="agreement-signature-line" />
              (signature)<p>Official Seal</p>
            </div>
            <div>
              <strong>Lessee:</strong>
              <p>Full Name: {fields.fullName || blank}</p>
              <div className="agreement-signature-line" />
              (signature)
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
