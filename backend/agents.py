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
            model="gemini/gemini-1.5-flash",
            temperature=0.7,
            api_key=google_key,
        )
        return llm, "gemini"


def create_agents(provider="gemini"):
    """Create all agents with the given LLM provider.

    Returns (researcher, writer, validator, provider_name) tuple.
    """
    llm, provider_name = _get_llm(provider)
    logger.info(f"Creating agents with LLM provider: {provider_name}")

    from crewai.tools import tool

    @tool("Tavily Search")
    def search_tool(query: str) -> str:
        """Useful for when you need to search the internet for information."""
        tavily = TavilySearchResults(
            max_results=3,
            tavily_api_key=os.environ.get("TAVILY_API_KEY")
        )
        return tavily.run(query)

    researcher = Agent(
        role='Lead Technical Researcher',
        goal='Identify, verify, and synthesize high-priority, technically accurate information on {topic}',
        backstory="""You are a world-class technical investigator. Your mission is to find 
        VERIFIABLE facts. You must distinguish actual breakthroughs from marketing buzz. 
        CRITICAL: Every fact you find MUST be linked to a real, accessible source URL. 
        NEVER use placeholder text like '[URL]' or 'Link here'—if you cannot find a 
        legitimate, specific URL for a point, you must either find a better source or 
        describe the information in a way that doesn't imply a missing citation.""",
        tools=[search_tool],
        llm=llm,
        allow_delegation=False,
        verbose=True,
        max_iter=3,
        max_rpm=10
    )

    writer = Agent(
        role='Expert Technical Report Architect',
        goal='Translate research data into a premium-grade markdown report with perfect structural integrity.',
        backstory="""You are a master of communication and structural logic. You take 
        raw technical data and transform it into compelling narratives. 
        CRITICAL RULE: Never include placeholder links or identifiers like '[URL]'. 
        All citations must be formatted as proper, clickable Markdown links. If 
        a URL is missing from the researcher's output, do not invent one; instead, 
        provide the most detailed textual reference possible without using 
        placeholder tags.""",
        llm=llm,
        allow_delegation=False,
        verbose=True,
        max_iter=1,
        max_rpm=10
    )

    validator = Agent(
        role='Structural Integrity & Citation Auditor',
        goal='Audit research findings for logical consistency and ensure 100% citation accuracy.',
        backstory="""You are a meticulous auditor. You cross-check every claim and 
        every URL. Your job is to catch hallucinations and broken links before they 
        reach the final report. You format every verified source into a clean, 
        consistent citation style. You have zero tolerance for placeholders.""",
        llm=llm,
        allow_delegation=False,
        verbose=True,
        max_iter=2,
        max_rpm=10
    )

    return researcher, writer, validator, provider_name


# Default agents (created at import time with Gemini)
try:
    researcher, writer, validator, _active_provider = create_agents("gemini")
except Exception as e:
    logger.warning(f"Gemini init failed ({e}), trying Groq fallback...")
    researcher, writer, validator, _active_provider = create_agents("groq")
