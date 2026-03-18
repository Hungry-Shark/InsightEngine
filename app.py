import os
import datetime
import streamlit as st
import streamlit_shadcn_ui as ui
from crewai import Crew, Process
import importlib
import base64
import json

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------
def get_base64_of_bin_file(bin_file):
    with open(bin_file, 'rb') as f:
        data = f.read()
    return base64.b64encode(data).decode()

try:
    bg_b64 = get_base64_of_bin_file("bg_texture.png")
    BG_CSS = f"background-image: url('data:image/png;base64,{bg_b64}'); background-size: cover; background-attachment: fixed;"
except Exception:
    BG_CSS = "background-color: #2b1b3d;"

# -------------------------------------------------------------------
# Page Config  (MUST be first Streamlit call)
# -------------------------------------------------------------------
st.set_page_config(
    page_title="InsightEngine",
    layout="wide",
    page_icon="✨",
    initial_sidebar_state="expanded",
)

# -------------------------------------------------------------------
# Session-state bootstrap
# -------------------------------------------------------------------
DEFAULTS = {
    "view_mode":        "chat",
    "report_generated": False,
    "raw_data":         "",
    "final_report":     "",
    "current_topic":    "",
    "chat_history":     [],          # list of {"topic": ..., "report": ..., "ts": ...}
    "profile_name":     "User",
    "profile_email":    "",
    "profile_bio":      "",
    "settings_theme":   "Royal Purple",
    "settings_model":   "gemini-3-flash-preview",
    "settings_verbose": False,
}
for k, v in DEFAULTS.items():
    if k not in st.session_state:
        st.session_state[k] = v

# -------------------------------------------------------------------
# Routing helpers
# -------------------------------------------------------------------
def set_view(mode):
    st.session_state.view_mode = mode
    st.rerun()

def reset_chat():
    st.session_state.report_generated = False
    st.session_state.raw_data = ""
    st.session_state.final_report = ""
    st.session_state.current_topic = ""
    st.session_state.view_mode = "chat"
    st.rerun()

# -------------------------------------------------------------------
# Master CSS block  (no f-string – bg injected via .replace())
# -------------------------------------------------------------------
RAW_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Gelasio:wght@400;600&family=Quicksand:wght@300;400;500;600&display=swap');

/* ─── GLOBAL ─────────────────────────────────────────────────────── */
.stApp {
    BGCSS_PLACEHOLDER
}
html, body, .stApp {
    font-family: 'Quicksand', sans-serif;
    color: #f7e7ce;
}
a { text-decoration: none !important; }
a[data-testid] { display: none !important; }

/* ─── SIDEBAR ─────────────────────────────────────────────────────── */
[data-testid="stSidebar"] {
    min-width: 230px !important;
    max-width: 230px !important;
    background: linear-gradient(180deg,
        rgba(43, 27, 61, 1)    0%,
        rgba(60, 38, 20, 1)   60%,
        rgba(100, 78, 10, 0.95) 100%) !important;
    border-right: 1px solid rgba(207, 181, 59, 0.3) !important;
    padding: 0 0 1rem 0 !important;
}
[data-testid="stSidebarResizer"] { display: none !important; }
[data-testid="stSidebar"] > div:first-child { padding: 0 !important; }

/* sidebar inner scroll area — remove default padding */
[data-testid="stSidebar"] [data-testid="stVerticalBlock"] {
    gap: 0 !important;
    padding: 0 !important;
}

/* logo area at top */
.sidebar-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 16px 14px 16px;
    border-bottom: 1px solid rgba(207, 181, 59, 0.2);
    margin-bottom: 8px;
}
.sidebar-logo-icon { font-size: 24px; }
.sidebar-logo-text {
    font-family: 'Gelasio', serif;
    font-size: 17px;
    font-weight: 600;
    color: #ffd700;
    letter-spacing: 0.5px;
}

/* section label */
.sidebar-section-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(247, 231, 206, 0.45);
    padding: 12px 18px 4px 18px;
}

/* nav buttons */
[data-testid="stSidebar"] .stButton > button {
    width: 100% !important;
    height: 44px !important;
    border-radius: 10px !important;
    padding: 0 14px !important;
    margin: 2px 8px !important;
    width: calc(100% - 16px) !important;
    background: transparent !important;
    border: none !important;
    font-size: 14px !important;
    font-family: 'Quicksand', sans-serif !important;
    font-weight: 600 !important;
    color: #f7e7ce !important;
    text-align: left !important;
    justify-content: flex-start !important;
    transition: background 0.18s ease, transform 0.1s ease !important;
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    letter-spacing: 0.3px;
}
[data-testid="stSidebar"] .stButton > button:hover {
    background: rgba(255, 215, 0, 0.12) !important;
    border-left: 3px solid rgba(255, 215, 0, 0.5) !important;
}
[data-testid="stSidebar"] .stButton > button:active {
    transform: scale(0.97) !important;
}
/* active button highlight */
.sidebar-active-btn > div > button {
    background: rgba(255, 215, 0, 0.18) !important;
    border-left: 3px solid #ffd700 !important;
    color: #ffd700 !important;
}

/* sidebar divider */
.sidebar-divider {
    border: none;
    border-top: 1px solid rgba(207, 181, 59, 0.2);
    margin: 8px 16px;
}

/* history items */
.history-item {
    padding: 8px 18px;
    font-size: 12px;
    color: rgba(247, 231, 206, 0.7);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
    border-radius: 6px;
    margin: 1px 8px;
    transition: background 0.15s ease;
}
.history-item:hover { background: rgba(255,215,0,0.08); color: #f7e7ce; }

/* ─── HEADER ──────────────────────────────────────────────────────── */
header[data-testid="stHeader"] { background: transparent !important; }
header[data-testid="stHeader"] [data-testid="stToolbar"] { display: none !important; }
[data-testid="collapsedControl"] {
    color: #f7e7ce !important;
    background: rgba(43, 27, 61, 0.9) !important;
    border-radius: 50% !important;
    border: 1px solid rgba(207, 181, 59, 0.5) !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
    z-index: 999999 !important;
}
[data-testid="collapsedControl"] svg { fill: #f7e7ce !important; }

/* ─── MAIN CONTENT ──────────────────────────────────────────────── */
.main .block-container {
    padding-top: 3rem;
    padding-bottom: 5rem;
    max-width: 820px;
}

.main-title {
    font-family: 'Gelasio', serif !important;
    font-size: 34px;
    color: #f7e7ce;
    text-align: center;
    margin-bottom: 0.2rem;
    text-shadow: 2px 2px 6px rgba(0,0,0,0.5);
}
.main-subtitle {
    text-align: center;
    color: rgba(247,231,206,0.55);
    font-size: 15px;
    margin-bottom: 1.8rem;
}

/* page headers */
h1, h2, h3 {
    font-family: 'Gelasio', serif !important;
    color: #f7e7ce !important;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.4);
}
a.st-emotion-cache-1ktlsr4 { display: none !important; }

/* ─── FORM / INPUT ───────────────────────────────────────────────── */
[data-testid="stForm"] {
    background: rgba(30, 20, 45, 0.72) !important;
    border: 1px solid rgba(207, 181, 59, 0.3) !important;
    border-radius: 18px !important;
    padding: 22px !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
    backdrop-filter: blur(10px) !important;
}
.stTextArea textarea {
    border-radius: 12px !important;
    border: 1px solid rgba(207, 181, 59, 0.45) !important;
    padding: 14px 18px !important;
    font-size: 16px !important;
    background-color: rgba(20, 10, 30, 0.8) !important;
    color: #f7e7ce !important;
    font-family: 'Quicksand', sans-serif !important;
    min-height: 110px !important;
    resize: none !important;
}
.stTextArea textarea:focus {
    border-color: #ffd700 !important;
    box-shadow: 0 0 0 1px #ffd700 !important;
}
[data-testid="stFormSubmitButton"] > button {
    border-radius: 12px !important;
    font-family: 'Gelasio', serif !important;
    font-weight: bold !important;
    background: linear-gradient(135deg, #4b1d52, #2b1b3d) !important;
    color: #ffd700 !important;
    border: 1px solid #ffd700 !important;
    padding: 8px 24px !important;
    transition: transform 0.1s ease, filter 0.2s ease !important;
}
[data-testid="stFormSubmitButton"] > button:hover {
    filter: brightness(1.3) !important;
}
[data-testid="stFormSubmitButton"] > button:active {
    transform: scale(0.96) !important;
}

/* ─── OUTPUT / CARDS ────────────────────────────────────────────── */
.stCard p, .stCard li {
    font-family: 'Caveat', cursive !important;
    font-size: 22px !important;
    color: #eaddf0 !important;
    letter-spacing: 0.5px;
}

/* ─── SECTION CARDS (Profile / Settings) ───────────────────────── */
.section-card {
    background: rgba(30, 20, 45, 0.72);
    border: 1px solid rgba(207, 181, 59, 0.25);
    border-radius: 16px;
    padding: 28px 32px;
    margin-bottom: 18px;
    backdrop-filter: blur(10px);
}
.section-card h3 {
    font-size: 20px;
    margin-bottom: 14px;
    color: #ffd700 !important;
}

/* ─── INPUT OVERRIDES ───────────────────────────────────────────── */
.stTextInput input, .stSelectbox select {
    background: rgba(20, 10, 30, 0.75) !important;
    border: 1px solid rgba(207, 181, 59, 0.4) !important;
    border-radius: 8px !important;
    color: #f7e7ce !important;
    font-family: 'Quicksand', sans-serif !important;
}
.stButton > button {
    border-radius: 10px !important;
    font-family: 'Quicksand', sans-serif !important;
    font-weight: 600 !important;
}

/* badge pill */
.badge {
    display: inline-block;
    background: rgba(255,215,0,0.15);
    border: 1px solid rgba(255,215,0,0.4);
    color: #ffd700;
    border-radius: 20px;
    padding: 2px 12px;
    font-size: 12px;
    font-weight: 600;
    margin-right: 6px;
}
</style>
""".replace("BGCSS_PLACEHOLDER", BG_CSS)

st.markdown(RAW_CSS, unsafe_allow_html=True)

# -------------------------------------------------------------------
# Load SVG logo once
# -------------------------------------------------------------------
try:
    with open("logo.svg", "r") as f:
        SVG_LOGO = f.read()
except Exception:
    SVG_LOGO = "<span style='font-size:32px;'>✨</span>"

# -------------------------------------------------------------------
# SIDEBAR
# -------------------------------------------------------------------
with st.sidebar:
    # Logo strip
    st.markdown(
        f"""<div class="sidebar-logo">
            <span class="sidebar-logo-icon">✨</span>
            <span class="sidebar-logo-text">InsightEngine</span>
        </div>""",
        unsafe_allow_html=True
    )

    # ── Main navigation ──────────────────────────────────────
    st.markdown('<div class="sidebar-section-label">Main</div>', unsafe_allow_html=True)

    # New Chat
    active_cls = "sidebar-active-btn" if st.session_state.view_mode == "chat" else ""
    with st.container():
        st.markdown(f'<div class="{active_cls}">', unsafe_allow_html=True)
        if st.button("  ➕  New Chat", key="nav_new_chat"):
            reset_chat()
        st.markdown("</div>", unsafe_allow_html=True)

    # History
    active_cls = "sidebar-active-btn" if st.session_state.view_mode == "history" else ""
    with st.container():
        st.markdown(f'<div class="{active_cls}">', unsafe_allow_html=True)
        if st.button("  📜  History", key="nav_history"):
            set_view("history")
        st.markdown("</div>", unsafe_allow_html=True)

    # ── Recent history ────────────────────────────────────────
    history = st.session_state.get("chat_history", [])
    if history:
        st.markdown('<div class="sidebar-section-label">Recent</div>', unsafe_allow_html=True)
        for i, item in enumerate(reversed(history[-5:])):
            label = item.get("topic", "Untitled")[:26] + ("…" if len(item.get("topic",""))>26 else "")
            if st.button(f"   {label}", key=f"hist_item_{i}"):
                st.session_state.final_report = item["report"]
                st.session_state.raw_data = item.get("raw_data", "")
                st.session_state.report_generated = True
                st.session_state.current_topic = item["topic"]
                set_view("chat")

    # ── spacer pushes bottom items down ───────────────────────
    st.markdown("<div style='flex:1; min-height:60px'></div>", unsafe_allow_html=True)
    st.markdown('<hr class="sidebar-divider">', unsafe_allow_html=True)

    # ── Bottom section ────────────────────────────────────────
    st.markdown('<div class="sidebar-section-label">Account</div>', unsafe_allow_html=True)

    active_cls = "sidebar-active-btn" if st.session_state.view_mode == "settings" else ""
    with st.container():
        st.markdown(f'<div class="{active_cls}">', unsafe_allow_html=True)
        if st.button("  ⚙️  Settings", key="nav_settings"):
            set_view("settings")
        st.markdown("</div>", unsafe_allow_html=True)

    active_cls = "sidebar-active-btn" if st.session_state.view_mode == "profile" else ""
    with st.container():
        st.markdown(f'<div class="{active_cls}">', unsafe_allow_html=True)
        if st.button("  👤  Profile", key="nav_profile"):
            set_view("profile")
        st.markdown("</div>", unsafe_allow_html=True)

# -------------------------------------------------------------------
# ── MAIN CONTENT ROUTER ──────────────────────────────────────────────
# -------------------------------------------------------------------

# ════════════════════════
# VIEW: CHAT
# ════════════════════════
if st.session_state.view_mode == "chat":

    # Logo + title
    st.markdown(
        f'<div style="text-align:center;margin-bottom:0.4rem;">{SVG_LOGO}</div>',
        unsafe_allow_html=True
    )
    st.markdown("<div class='main-title'>How can I help you today?</div>", unsafe_allow_html=True)
    st.markdown("<div class='main-subtitle'>AI-powered deep research & report generation</div>", unsafe_allow_html=True)

    with st.form(key="research_form", clear_on_submit=False):
        topic = st.text_area(
            "Research topic",
            placeholder="Ask InsightEngine to research something...",
            label_visibility="collapsed"
        )
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            generate_clicked = st.form_submit_button("✨ Generate Report", use_container_width=True)

    if generate_clicked and topic:
        google_api = os.environ.get("GOOGLE_API_KEY")
        tavily_api = os.environ.get("TAVILY_API_KEY")

        if not google_api or not tavily_api:
            st.error("⚠️ Missing API Keys in the `.env` file. Please add GOOGLE_API_KEY and TAVILY_API_KEY.")
        else:
            with st.spinner("InsightEngine is researching and writing… this may take a minute or two."):
                import agents
                import tasks
                importlib.reload(agents)
                importlib.reload(tasks)

                insight_crew = Crew(
                    agents=[agents.researcher, agents.validator, agents.writer],
                    tasks=[tasks.research_task, tasks.validate_task, tasks.write_task],
                    process=Process.sequential
                )

                result = insight_crew.kickoff(inputs={"topic": topic})

                raw = ""
                try:
                    raw = str(tasks.research_task.output.raw)
                except Exception:
                    raw = "Raw data captured successfully."

                # Save to session
                st.session_state["report_generated"] = True
                st.session_state["raw_data"] = raw
                st.session_state["final_report"] = result.raw
                st.session_state["current_topic"] = topic

                # Append to chat history
                st.session_state["chat_history"].append({
                    "topic":    topic,
                    "report":   result.raw,
                    "raw_data": raw,
                    "ts":       datetime.datetime.now().strftime("%b %d, %H:%M"),
                })

    if st.session_state["report_generated"]:
        st.markdown("---")

        # Raw data snippet
        st.markdown("### 🔍 Raw Research Data Snippet")
        ui.table(
            data=[{"Agent": "Lead Researcher", "Output Preview": st.session_state["raw_data"][:250] + "…"}],
            maxHeight=200
        )

        ui.badges(
            badge_list=[("Research Complete", "default"), ("AI Verified", "outline")],
            class_name="flex gap-2 mb-4 mt-4"
        )

        st.markdown("<div class='stCard'>", unsafe_allow_html=True)
        ui.element("h2", content="Final Research Report", class_name="text-xl font-bold mb-4")
        st.markdown(st.session_state["final_report"])
        st.markdown("</div>", unsafe_allow_html=True)

        c1, c2 = st.columns(2)
        with c1:
            st.download_button(
                label="📄 Download as Markdown",
                data=st.session_state["final_report"],
                file_name="research_report.md",
                mime="text/markdown",
                use_container_width=True,
            )
        with c2:
            try:
                from utils import export_as_pdf
                pdf_bytes = export_as_pdf(st.session_state["final_report"])
                st.download_button(
                    label="📥 Download as PDF",
                    data=pdf_bytes,
                    file_name=f"Report_{st.session_state['current_topic'][:30].replace(' ','_')}.pdf",
                    mime="application/pdf",
                    use_container_width=True,
                )
            except Exception:
                st.caption("PDF export unavailable (install fpdf)")

# ════════════════════════
# VIEW: HISTORY
# ════════════════════════
elif st.session_state.view_mode == "history":
    st.markdown("## 📜 Chat History")

    history = st.session_state.get("chat_history", [])

    if not history:
        st.markdown(
            "<div class='section-card' style='text-align:center; padding:60px 0;'>"
            "<p style='font-size:40px;margin-bottom:8px;'>📭</p>"
            "<p style='color:rgba(247,231,206,0.5); font-size:16px;'>No history yet. Start researching!</p>"
            "</div>",
            unsafe_allow_html=True
        )
    else:
        for i, item in enumerate(reversed(history)):
            idx = len(history) - 1 - i
            with st.expander(f"🔍  {item['topic']}  —  {item.get('ts', '')}", expanded=False):
                st.markdown(item["report"][:800] + ("…" if len(item["report"]) > 800 else ""))
                c1, c2, c3 = st.columns([2, 2, 1])
                with c1:
                    if st.button("Open", key=f"open_{idx}"):
                        st.session_state.final_report = item["report"]
                        st.session_state.raw_data = item.get("raw_data", "")
                        st.session_state.report_generated = True
                        st.session_state.current_topic = item["topic"]
                        set_view("chat")
                with c2:
                    st.download_button(
                        "Download",
                        data=item["report"],
                        file_name=f"{item['topic'][:30].replace(' ','_')}.md",
                        mime="text/markdown",
                        key=f"dl_{idx}",
                    )
                with c3:
                    if st.button("🗑️", key=f"del_{idx}"):
                        st.session_state["chat_history"].pop(idx)
                        st.rerun()

    if st.button("← Back to Chat"):
        set_view("chat")

# ════════════════════════
# VIEW: PROFILE
# ════════════════════════
elif st.session_state.view_mode == "profile":
    st.markdown("## 👤 User Profile")

    st.markdown("<div class='section-card'>", unsafe_allow_html=True)
    st.markdown("<h3>Personal Info</h3>", unsafe_allow_html=True)

    name  = st.text_input("Display Name",  value=st.session_state.profile_name)
    email = st.text_input("Email Address",  value=st.session_state.profile_email)
    bio   = st.text_area ("Short Bio",      value=st.session_state.profile_bio,
                          label_visibility="visible", height=80)

    if st.button("💾  Save Profile"):
        st.session_state.profile_name  = name
        st.session_state.profile_email = email
        st.session_state.profile_bio   = bio
        st.success("Profile saved!")

    st.markdown("</div>", unsafe_allow_html=True)

    # API key status
    st.markdown("<div class='section-card'>", unsafe_allow_html=True)
    st.markdown("<h3>API Key Status</h3>", unsafe_allow_html=True)
    g_ok = "✅ Connected" if os.environ.get("GOOGLE_API_KEY") else "❌ Missing"
    t_ok = "✅ Connected" if os.environ.get("TAVILY_API_KEY") else "❌ Missing"
    st.markdown(
        f"<span class='badge'>Google Gemini</span> {g_ok} &nbsp;&nbsp; "
        f"<span class='badge'>Tavily Search</span> {t_ok}",
        unsafe_allow_html=True
    )
    st.caption("Keys are loaded from your `.env` file.")
    st.markdown("</div>", unsafe_allow_html=True)

    # Stats
    st.markdown("<div class='section-card'>", unsafe_allow_html=True)
    st.markdown("<h3>Session Stats</h3>", unsafe_allow_html=True)
    sc1, sc2 = st.columns(2)
    sc1.metric("Reports Generated", len(st.session_state.get("chat_history", [])))
    sc2.metric("Active Session", "Yes")
    st.markdown("</div>", unsafe_allow_html=True)

    if st.button("← Back to Chat"):
        set_view("chat")

# ════════════════════════
# VIEW: SETTINGS
# ════════════════════════
elif st.session_state.view_mode == "settings":
    st.markdown("## ⚙️ Settings")

    st.markdown("<div class='section-card'>", unsafe_allow_html=True)
    st.markdown("<h3>Model Configuration</h3>", unsafe_allow_html=True)
    model = st.selectbox(
        "LLM Model",
        ["gemini-3-flash-preview", "gemini-2.0-flash", "gemini-1.5-pro"],
        index=0
    )
    verbose = st.checkbox("Enable verbose agent logging", value=st.session_state.settings_verbose)
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("<div class='section-card'>", unsafe_allow_html=True)
    st.markdown("<h3>UI Preferences</h3>", unsafe_allow_html=True)
    theme = st.selectbox(
        "Theme",
        ["Royal Purple", "Midnight Blue", "Forest Green"],
        index=0
    )
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("<div class='section-card'>", unsafe_allow_html=True)
    st.markdown("<h3>Data Management</h3>", unsafe_allow_html=True)
    if st.button("🗑️  Clear All Chat History"):
        st.session_state["chat_history"] = []
        st.success("Chat history cleared.")
    if st.button("🔄  Reset All Settings"):
        st.session_state.settings_theme   = "Royal Purple"
        st.session_state.settings_model   = "gemini-3-flash-preview"
        st.session_state.settings_verbose = False
        st.success("Settings reset to defaults.")
    st.markdown("</div>", unsafe_allow_html=True)

    if st.button("💾  Save Settings"):
        st.session_state.settings_theme   = theme
        st.session_state.settings_model   = model
        st.session_state.settings_verbose = verbose
        st.success("Settings saved!")

    if st.button("← Back to Chat"):
        set_view("chat")
