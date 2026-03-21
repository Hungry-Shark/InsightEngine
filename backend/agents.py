from crewai import Agent, LLM
from langchain_community.tools.tavily_search import TavilySearchResults
import os
import logging

logger = logging.getLogger(__name__)

# Support both key names for Gemini
google_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
groq_key = os.getenv("GROQ_API_KEY")


def _get_llm(provider="gemini"):
    """Create an LLM instance for the given provider using CrewAI's native LLM class.

    Returns (llm, provider_name) tuple.
    """
    if provider == "groq":
        if not groq_key:
            raise RuntimeError(
                "No GROQ_API_KEY found in .env. "
                "Get a free key at https://console.groq.com"
            )
        llm = LLM(
            model="groq/llama-3.3-70b-versatile",
            temperature=0.5,
            api_key=groq_key,
            max_tokens=2048,
        )
        return llm, "groq"
    elif provider == "kaggle-qwen":
        kaggle_url = os.environ.get("KAGGLE_INTERNVL_URL")
        if not kaggle_url:
            raise RuntimeError(
                "No KAGGLE_INTERNVL_URL found in .env. "
                "Run the Kaggle notebook and update the URL."
            )
        # OpenAI-compatible API on Kaggle
        llm = LLM(
            model="openai/qwen2-vl", # Updated to Qwen2-VL
            base_url=f"{kaggle_url.rstrip('/')}/v1",
            api_key="none", # Not needed for the custom tunnel
            temperature=0.7,
        )
        return llm, "kaggle-qwen"
    else:
        if not google_key:
            raise RuntimeError("No GOOGLE_API_KEY or GEMINI_API_KEY found in .env.")
        llm = LLM(
            model="gemini/gemini-2.5-flash",
            temperature=0.7,
            api_key=google_key,
        )
        return llm, "gemini"


def create_agents(provider="gemini"):
    """Create all agents with the given LLM provider.

    Returns (researcher, writer, validator, manager, provider_name) tuple.
    """
    llm, provider_name = _get_llm(provider)
    logger.info(f"Creating agents with LLM provider: {provider_name}")

    from crewai.tools import tool

    @tool("Tavily Intelligence Search")
    def search_tool(query: str) -> str:
        """High-depth cognitive search. Useful for finding technical facts and verifiable breakthroughs."""
        tavily = TavilySearchResults(
            max_results=5,
            tavily_api_key=os.environ.get("TAVILY_API_KEY")
        )
        return tavily.run(query)

    manager = Agent(
        role='Intelligence Operations Manager',
        goal='Oversee the complex cognitive workload of the research team to ensure 100% accurate, high-depth synthesis.',
        backstory="""You are the strategic brain of the InsightEngine. Your job is to break 
        down complex research goals into specialized sub-tasks, coordinate the efforts 
        between discovery, synthesis, and validation, and ensure that the final 
        output reflects System 2 level deep-reasoning. You audit the trajectory of 
        decisions to catch logical gaps early.""",
        llm=llm,
        allow_delegation=True,
        verbose=True,
        memory=True
    )

    researcher = Agent(
        role='Deep Discovery Specialist (System 2 Explorer)',
        goal='Employ Tree of Thoughts (ToT) exploration to identify, verify, and verify high-priority technical data on {topic}',
        backstory="""You are a world-class technical investigator utilizing 'System 2' 
        slow-reasoning. Instead of a linear search, you explore multiple research 
        trajectories (ToT), evaluating each for technical depth and citation strength. 
        Your mission is to find VERIFIABLE facts. If a lead is a dead end, you backtrack.
        CRITICAL: Every fact found MUST be linked to a real, accessible source URL. 
         halluncinations are caught by your internal reflection loop before you report findings.""",
        tools=[search_tool],
        llm=llm,
        allow_delegation=False,
        verbose=True,
        max_iter=5,  # Increased for depth
        max_rpm=10,
        memory=True
    )

    writer = Agent(
        role='Cognitive Synthesis Architect',
        goal='Synthesize raw technical data into a premium markdown report with perfect structural and logical integrity.',
        backstory="""You are a master of technical narrative and structural logic. 
        You don't just summarize; you synthesize insights into a cohesive strategic 
        framework. You treat the report architecture as a neuro-symbolic bridge between 
        raw data and human understanding. MANDATORY: All citations must be proper, 
        clickable links. Placeholder tokens like '[URL]' are strictly forbidden.""",
        llm=llm,
        allow_delegation=False,
        verbose=True,
        max_iter=2,
        max_rpm=10,
        memory=True
    )

    validator = Agent(
        role='Critical Reflexion Auditor',
        goal='Perform an adversarial audit of research findings using the LLM-as-a-Judge pattern for 100% accuracy.',
        backstory="""You are an adversarial auditor tasked with catching hallucinations. 
        You follow the 'Act-Observe-Reflect' loop. If you find a logical gap or a 
        missing citation, you reject the draft and force a re-discovery phase. 
        Your standards are absolute: if it isn't verified, it doesn't exist in the report. 
        You focus on 'System 2' oversight to ensure high-stakes technical reliability.""",
        llm=llm,
        allow_delegation=True,
        verbose=True,
        max_iter=3,
        max_rpm=10,
        memory=True
    )

    return researcher, writer, validator, manager, provider_name


# Default agents (created at import time with Gemini)
try:
    researcher, writer, validator, manager, _active_provider = create_agents("gemini")
except Exception as e:
    logger.warning(f"Gemini init failed ({e}), trying Groq fallback...")
    researcher, writer, validator, manager, _active_provider = create_agents("groq")
