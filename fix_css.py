import re
with open("C:/Users/chhan/InsightEngine/app.py", "r", encoding="utf-8") as f:
    content = f.read()
start_idx = content.find('css_block = """\n<style>')
end_idx = content.find('</style>\n""".replace("{bg_css}", bg_css)', start_idx)
if start_idx != -1 and end_idx != -1:
    css_content = content[start_idx:end_idx]
    css_content = css_content.replace("{{", "{").replace("}}", "}")
    content = content[:start_idx] + css_content + content[end_idx:]
    with open("C:/Users/chhan/InsightEngine/app.py", "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed CSS brackets successfully.")
else:
    print("Could not find css_block boundaries.")
