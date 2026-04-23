import unittest
from unittest.mock import MagicMock, patch
import sys

# Mock fpdf before importing utils
mock_fpdf_module = MagicMock()
sys.modules["fpdf"] = mock_fpdf_module

from backend.utils import export_as_pdf

class TestExportAsPdf(unittest.TestCase):
    def setUp(self):
        # Reset the mock for each test
        mock_fpdf_module.FPDF.return_value = MagicMock()
        self.mock_pdf = mock_fpdf_module.FPDF.return_value
        # Default mock behavior for string width
        self.mock_pdf.get_string_width.return_value = 10
        # Default mock behavior for y position
        self.mock_pdf.get_y.return_value = 10
        # Mock output to return a string (as fpdf's dest='S' does)
        self.mock_pdf.output.return_value = "PDF content"

    def get_called_texts(self):
        texts = []
        for call in self.mock_pdf.cell.call_args_list:
            # cell(w, h, txt, ...)
            if 'txt' in call.kwargs:
                texts.append(call.kwargs['txt'])
            elif len(call.args) >= 3:
                texts.append(call.args[2])
            elif len(call.args) == 1:
                # Might be cell(0, 6, txt=...) called as cell(0, 6, "text") but mocked differently?
                # Actually if it's called as pdf.cell(0, 6, txt=current_line.strip(), ln=True)
                # it should be in kwargs.
                pass
            else:
                texts.append(None)
        return texts

    def test_export_as_pdf_basic(self):
        report_text = "Hello World"
        result = export_as_pdf(report_text)

        self.assertIsInstance(result, bytes)
        self.assertEqual(result, b"PDF content")
        self.mock_pdf.add_page.assert_called()
        self.mock_pdf.set_font.assert_any_call("Arial", 'B', 16)

        called_texts = self.get_called_texts()
        self.assertIn("InsightEngine Research Report", called_texts)
        self.assertIn("Hello World", called_texts)

    def test_text_cleaning(self):
        report_text = "# Title\n**Bold** and *Italic*"
        export_as_pdf(report_text)

        called_texts = self.get_called_texts()
        # "# Title" -> " Title" if it just replaces # with empty string.
        # But wait, paragraph.split(' ') and strip().
        # "# Title" -> paragraph is "# Title". words = ["#", "Title"].
        # But clean_text is done first.
        # clean_text = " Title\nBold and -Italic-"
        # Paragraph 1: " Title". words = ["", "Title"]. current_line = "Title "
        self.assertIn("Title", called_texts)
        self.assertIn("Bold and -Italic-", called_texts)

    def test_latin1_encoding_handling(self):
        # Unicode character that is not in Latin-1
        report_text = "Emoji: \U0001F600"
        export_as_pdf(report_text)

        called_texts = self.get_called_texts()
        self.assertTrue(any("Emoji:" in (t or "") for t in called_texts))

    def test_page_break_logic(self):
        self.mock_pdf.get_y.return_value = 280

        report_text = "Paragraph 1\n\nParagraph 2"
        export_as_pdf(report_text)

        # Should have multiple add_page calls
        self.assertGreater(self.mock_pdf.add_page.call_count, 1)

    def test_long_word_wrapping(self):
        # max_width is 190.
        def side_effect(text):
            if "ThisIsAVeryVeryVeryVeryLongWordThatExceedsMaxWidth" in text:
                return 200
            return 10

        self.mock_pdf.get_string_width.side_effect = side_effect

        report_text = "ThisIsAVeryVeryVeryVeryLongWordThatExceedsMaxWidth"
        export_as_pdf(report_text)

        called_texts = self.get_called_texts()
        self.assertIn("ThisIsAVeryVeryVeryVeryLongWordThatExceedsMaxWidth", called_texts)

if __name__ == '__main__':
    unittest.main()
