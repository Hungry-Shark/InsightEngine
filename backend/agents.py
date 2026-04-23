from crewai import Agent, LLM
from langchain_community.tools.tavily_search import TavilySearchResults
import os
import logging

logger = logging.getLogger(__name__)

# Support both key names for Gemini
google_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
groq_key = os.getenv("GROQ_API_KEY")


def _get_llm(provider="gemini"):
    if provider == "groq":
        if not groq_key:
            raise RuntimeError("No GROQ_API_KEY found in .env.")
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
            raise RuntimeError("No KAGGLE_INTERNVL_URL found in .env.")
        llm = LLM(
            model="openai/qwen2-vl",
            base_url=f"{kaggle_url.rstrip('/')}/v1",
            api_key="none",
            temperature=0.7,
        )
        return llm, "kaggle-qwen"
    elif provider == "kaggle-internvl38b":
        kaggle_38b_url = os.environ.get("KAGGLE_INTERNVL38B_URL")
        if not kaggle_38b_url:
            raise RuntimeError("No KAGGLE_INTERNVL38B_URL found in .env.")
        llm = LLM(
            model="openai/internvl2.5-38b",
            base_url=f"{kaggle_38b_url.rstrip('/')}/v1",
            api_key="none",
            temperature=0.7,
        )
        return llm, "kaggle-internvl38b"
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
    llm, provider_name = _get_llm(provider)
    logger.info(f"Creating agents with LLM provider: {provider_name}")

    from crewai.tools import tool

    @tool("Tavily Intelligence Search")
    def search_tool(query: str) -> str:
        """High-depth cognitive search. Useful for finding technical facts, market data, and verifiable breakthroughs."""
        tavily = TavilySearchResults(
            max_results=5,
            tavily_api_key=os.environ.get("TAVILY_API_KEY", "")
        )
        return tavily.run(query)

    manager = Agent(
        role='Project Operations Manager',
        goal='Oversee the complex cognitive workload of the project research team to ensure 100% accurate, high-depth synthesis covering market, tech, and business aspects.',
        backstory="You are the strategic brain of the InsightEngine. Your job is to break down complex project goals into specialized sub-tasks, coordinate the efforts between market analysis, technical architecture, business strategy, synthesis, and validation. You audit the trajectory of decisions to catch logical gaps early.",
        llm=llm,
        allow_delegation=True,
        verbose=True
    )

    market_analyst = Agent(
        role='Market & Competitor Analyst',
        goal='Employ deep exploration to identify market gaps, target audience, and competitors for the project on {topic}.',
        backstory="You are a world-class market researcher. You explore market trends, evaluate competitor strategies, and identify unique market gaps and target demographics. CRITICAL: Every fact found MUST be linked to a real, accessible source URL.",
        tools=[search_tool],
        llm=llm,
        allow_delegation=False,
        verbose=True,
        max_iter=2,
        max_rpm=10
    )

    tech_architect = Agent(
        role='Technical Architect & Builder',
        goal='Determine the optimal tech stack, building process, and technical constraints for the project on {topic}.',
        backstory="You are a seasoned technical lead. You research how to actually build the proposed project. You identify the best technologies, frameworks, APIs, and potential technical hurdles. CRITICAL: Provide citations and documentation links for tech choices.",
        tools=[search_tool],
        llm=llm,
        allow_delegation=False,
        verbose=True,
        max_iter=2,
        max_rpm=10
    )

    business_strategist = Agent(
        role='Business & Growth Strategist',
        goal='Formulate a business plan, revenue model, and promotion strategy for the project on {topic}.',
        backstory="You are a savvy business strategist. You research monetization strategies, launch plans, marketing channels, and revenue models suitable for the project. CRITICAL: Validate your strategies with real-world examples and source URLs.",
        tools=[search_tool],
        llm=llm,
        allow_delegation=False,
        verbose=True,
        max_iter=2,
        max_rpm=10
    )

    writer = Agent(
        role='Cognitive Synthesis Architect',
        goal='Synthesize raw market, technical, and business data into a premium markdown report with perfect structural and logical integrity.',
        backstory="You are a master of technical and business narrative. You synthesize insights into a cohesive strategic framework for the user's project. MANDATORY: All citations must be proper, clickable links. Placeholder tokens like '[URL]' are strictly forbidden.",
        llm=llm,
        allow_delegation=False,
        verbose=True,
        max_iter=2,
        max_rpm=10
    )

    validator = Agent(
        role='Critical Reflexion Auditor',
        goal='Perform an adversarial audit of all research findings using the LLM-as-a-Judge pattern to ensure 100% accuracy and complete coverage.',
        backstory="You are an adversarial auditor tasked with catching hallucinations and ensuring the business, tech, and market research are perfectly aligned and cited. You follow the 'Act-Observe-Reflect' loop. Your standards are absolute: if it isn't verified, it doesn't exist in the report.",
        llm=llm,
        allow_delegation=True,
        verbose=True,
        max_iter=2,
        max_rpm=10
    )

    return market_analyst, tech_architect, business_strategist, writer, validator, manager, provider_name


# Default agents
try:
    market_analyst, tech_architect, business_strategist, writer, validator, manager, _active_provider = create_agents("gemini")
except Exception as e:
    logger.warning(f"Gemini init failed ({e}), trying Groq fallback...")
    try:
        market_analyst, tech_architect, business_strategist, writer, validator, manager, _active_provider = create_agents("groq")
    except Exception:
        pass # allow module to load even if APIs are missing at init time
