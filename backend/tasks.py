from crewai import Task

def create_tasks(market_analyst, tech_architect, business_strategist, writer, validator):
    """Create all tasks with the given agents.

    Returns (market_task, tech_task, business_task, validate_task, write_task) tuple.
    """

    market_task = Task(
        description="""
        1. Deep dive into the market landscape for the user's project: '{topic}'.
        2. Identify the core target audience and their pain points.
        3. Analyze current competitors and find market gaps where this project can succeed.
        4. For each major finding:
           - Provide an accurate, verifiable breakdown.
           - Provide at least one LEGITIMATE, specific source URL.
        """,
        expected_output="A high-accuracy market intelligence dossier containing audience demographics, competitor analysis, and clear market gaps with verified URLs.",
        agent=market_analyst
    )

    tech_task = Task(
        description="""
        1. Leverage strategic thinking to determine how to build the user's project: '{topic}'.
        2. Identify the optimal tech stack, APIs, and frameworks needed for the project.
        3. Highlight any potential technical bottlenecks or challenges.
        4. For each major finding:
           - Provide an accurate, verifiable breakdown of why this tech is the best fit.
           - Provide at least one LEGITIMATE, specific source URL (e.g. documentation, tutorials).
        """,
        expected_output="A robust technical architecture and building plan containing the recommended tech stack, potential challenges, and verified URLs.",
        agent=tech_architect
    )

    business_task = Task(
        description="""
        1. Formulate a comprehensive business and growth strategy for the project: '{topic}'.
        2. Outline clear monetization strategies, revenue models, and a go-to-market plan.
        3. Detail the best channels for marketing and promotion to reach the target audience identified.
        4. For each major finding:
           - Provide an accurate, verifiable breakdown.
           - Provide at least one LEGITIMATE, specific source URL (e.g. case studies, strategy articles).
        """,
        expected_output="A detailed business strategy dossier containing monetization plans, promotion strategies, and verified URLs.",
        agent=business_strategist
    )

    validate_task = Task(
        description="""
        1. Conduct a 'Reflexion' loop on all three dossiers (Market, Tech, and Business).
        2. Act as an adversarial judge: Challenge the factual validity of each claim against the original intention of the project idea: '{topic}'.
        3. Audit every URL for dead links or placeholders. Ensure the research is cohesive across the three domains.
        4. If a claim is weak or hallucinated without a search, force a re-evaluation or discard it.
        5. Standardize all citations into professional markdown [Title](URL).
        """,
        expected_output="A bulletproof, verified set of combined factual insights (market, tech, business) tailored to address the user's project without hallucination.",
        agent=validator
    )

    write_task = Task(
        description="""
        1. Synthesize the verified market, technical, and business intelligence into a beautifully formatted markdown response.
        2. Structure the response dynamically based on the project idea: '{topic}'.
           - Must include sections for Market Analysis & Gaps, Technical Architecture & Building, and Business & Promotion Strategy.
           - Adjust headings dynamically. Make it cohesive.
        3. Ensure ZERO placeholders like '[URL]' remain. Integrate all verified links naturally as citations.
        4. DO NOT leak internal reasoning tokens like 'Thought' or 'Action' into the final markdown.
        """,
        expected_output="A perfectly formatted markdown report presenting the full project plan (market, tech, business) without unnecessary fluff or internal reasoning.",
        agent=writer
    )

    return market_task, tech_task, business_task, validate_task, write_task
