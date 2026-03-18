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
    else:
        if not google_key:
            raise RuntimeError("No GOOGLE_API_KEY or GEMINI_API_KEY found in .env.")
        llm = LLM(
            model="gemini/gemini-2.0-flash",
            temperature=0.5,
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
        goal='Identify and synthesize the most relevant, high-quality information on {topic}',
        backstory="""You are an elite researcher specialized in emerging technologies. 
        Your strength lies in navigating complex technical documentation and 
        distinguishing factual breakthroughs from marketing hype.""",
        tools=[search_tool],
        llm=llm,
        allow_delegation=False,
        verbose=True,
        max_iter=2,
        max_rpm=4
    )

    writer = Agent(
        role='Senior Technical Content Strategist',
        goal='Translate complex research data into a polished, executive-level markdown report.',
        backstory="""You are a master of communication. You take raw technical data 
        and transform it into structured, compelling narratives that are easy 
        for both developers and executives to understand.""",
        llm=llm,
        allow_delegation=False,
        verbose=True,
        max_iter=2,
        max_rpm=4
    )

    validator = Agent(
        role='Validation & Citation Specialist',
        goal='Cross-check research claims and form proper, reliable citations for every fact.',
        backstory="""You are a meticulous fact-checker and an academic citation expert. 
        You ensure every claim is verified and backed by proper URL sourcing, 
        so the final output is bulletproof.""",
        llm=llm,
        allow_delegation=False,
        verbose=True,
        max_iter=2,
        max_rpm=4
    )

    return researcher, writer, validator, provider_name


# Default agents (created at import time with Gemini)
try:
    researcher, writer, validator, _active_provider = create_agents("gemini")
except Exception as e:
    logger.warning(f"Gemini init failed ({e}), trying Groq fallback...")
    researcher, writer, validator, _active_provider = create_agents("groq")
