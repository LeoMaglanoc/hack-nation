"""Invoice PDF generation."""

from fpdf import FPDF

from src.core.types import InvoiceRequest


def build_invoice_pdf(payload: InvoiceRequest) -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "EasyBuy Invoice", ln=True)

    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, "", ln=True)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(90, 6, "Billed To", ln=0)
    pdf.cell(0, 6, "From", ln=True)

    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(90, 5, _customer_block(payload), border=0)
    y_after_customer = pdf.get_y()
    pdf.set_xy(110, pdf.get_y() - 20)
    pdf.multi_cell(0, 5, _sender_block(), border=0)

    pdf.set_y(max(y_after_customer, pdf.get_y()) + 4)

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(80, 7, "Item", 1)
    pdf.cell(40, 7, "Retailer", 1)
    pdf.cell(35, 7, "Delivery", 1)
    pdf.cell(30, 7, "Price", 1, ln=True, align="R")

    pdf.set_font("Helvetica", "", 10)
    for item in payload.items:
        pdf.cell(80, 7, item.name[:40], 1)
        pdf.cell(40, 7, item.retailer[:20], 1)
        pdf.cell(35, 7, item.delivery_date, 1)
        pdf.cell(30, 7, f"${item.price:.2f}", 1, ln=True, align="R")

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(155, 8, "Total", 1)
    pdf.cell(30, 8, f"${payload.total:.2f}", 1, ln=True, align="R")

    raw = pdf.output(dest="S")
    if isinstance(raw, str):
        return raw.encode("latin-1")
    return bytes(raw)


def _customer_block(payload: InvoiceRequest) -> str:
    customer = payload.customer
    return (
        f"{customer.full_name}\n"
        f"{customer.address}\n"
        f"{customer.city}, {customer.state} {customer.zip}\n"
        f"{customer.country}\n"
        f"{customer.email}\n"
        f"{customer.phone}"
    )


def _sender_block() -> str:
    return (
        "EasyBuy\n"
        "Munich, Germany\n"
        "easybuy@lemon.de"
    )
