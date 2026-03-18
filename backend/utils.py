from fpdf import FPDF

def export_as_pdf(report_text):
    pdf = FPDF()
    pdf.add_page()
    # Disable auto page break to take pixel-perfect manual control
    pdf.set_auto_page_break(auto=False)

    # Title
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt="InsightEngine Research Report", ln=True, align='C')
    pdf.ln(10)

    # Body
    pdf.set_font("Arial", size=11)
    clean_text = report_text.replace("#", "").replace("**", "").replace("*", "-")
    clean_text = clean_text.encode('latin-1', 'ignore').decode('latin-1')
    
    max_width = 190 # 210mm width - 20mm total horizontal margins
    
    for paragraph in clean_text.split('\n'):
        if not paragraph.strip():
            # Paragraph spacing
            if pdf.get_y() > 270:
                pdf.add_page()
            else:
                pdf.ln(3)
            continue
            
        words = paragraph.split(' ')
        current_line = ""
        
        for word in words:
            test_line = current_line + word + " "
            # If adding the word exceeds page width
            if pdf.get_string_width(test_line) > max_width:
                if current_line:
                    # Time to flush current line
                    if pdf.get_y() > 270:
                        pdf.add_page()
                    pdf.cell(0, 6, txt=current_line.strip(), ln=True)
                    current_line = word + " "
                else:
                    # Extremely long continuous word (e.g. huge URL)
                    if pdf.get_y() > 270:
                        pdf.add_page()
                    pdf.cell(0, 6, txt=word, ln=True)
                    current_line = ""
            else:
                current_line = test_line
                
        # Flush the remainder of the paragraph
        if current_line.strip():
            if pdf.get_y() > 270:
                pdf.add_page()
            pdf.cell(0, 6, txt=current_line.strip(), ln=True)
            
        # Add a tiny gap between paragraphs
        if pdf.get_y() > 270:
            pdf.add_page()
        else:
            pdf.ln(3)

    return pdf.output(dest='S').encode('latin-1')
