from crewai import Task


def create_tasks(researcher, writer, validator):
    """Create all tasks with the given agents.

    Returns (research_task, validate_task, write_task) tuple.
    """
    # Task 1: Deep Discovery & Intelligence Gathering (System 2)
    research_task = Task(
        description="""
        1. Leverage deep reasoning and strategic exploration to fully research the user's query: '{topic}'.
        2. Conduct comprehensive searches to find precise, accurate, and up-to-date data.
        3. Identify the most critical and contextually relevant information needed to answer the query directly.
        4. For each major finding:
           - Provide an accurate, verifiable breakdown.
           - Provide at least one LEGITIMATE, specific source URL.
        5. REFLECTION LOOP: Before finalizing your data, self-audit to ensure you actually searched for and found the specifically requested information.
        """,
        expected_output="A high-accuracy intelligence dossier containing all essential verified facts and URLs to fully answer the user's query.",
        agent=researcher
    )

    # Task 2: Adversarial Validation & Reliability Audit (Reflexion)
    validate_task = Task(
        description="""
        1. Conduct a 'Reflexion' loop on the Discovery Specialist's dossier. 
        2. Act as an adversarial judge: Challenge the factual validity of each claim against the original intention of the query.
        3. Audit every URL for dead links or placeholders. 
        4. If a claim is weak or hallucinated without a search, force a re-evaluation or discard it.
        5. Standardize citations into professional markdown [Title](URL).
        """,
        expected_output="A bulletproof, verified set of factual insights tailored to address the user's query without hallucination.",
        agent=validator
    )

    # Task 3: Cognitive Report Synthesis & Strategic Outlook
    write_task = Task(
        description="""
        1. Synthesize the verified intelligence into a beautifully formatted markdown response.
        2. Structure the response dynamically based on the intent of the original query: '{topic}'. 
           - If they asked for a syllabus, list it out cleanly. 
           - If they asked for a strategic essay, write a deep-dive. 
           - Adjust headings dynamically. Do NOT force a multi-point sequence if it is not appropriate.
        3. Ensure ZERO placeholders like '[URL]' remain. Integrate all verified links naturally.
        4. DO NOT leak internal reasoning tokens like 'Thought' or 'Action' into the final markdown.
        """,
        expected_output="A perfectly formatted markdown response directly answering the user's query without unnecessary fluff or internal reasoning.",
        agent=writer
    )

    return research_task, validate_task, write_task
