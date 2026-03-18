from fpdf import FPDF

def export_as_pdf(report_text):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Title
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt="InsightEngine Research Report", ln=True, align='C')
    pdf.ln(10)

    # Body
    pdf.set_font("Arial", size=12)
    clean_text = report_text.replace("#", "").replace("**", "").replace("*", "-")
    clean_text = clean_text.encode('latin-1', 'ignore').decode('latin-1')
    pdf.multi_cell(0, 10, txt=clean_text)

    return pdf.output(dest='S').encode('latin-1')
