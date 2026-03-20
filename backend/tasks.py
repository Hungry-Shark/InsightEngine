from crewai import Task


def create_tasks(researcher, writer, validator):
    """Create all tasks with the given agents.

    Returns (research_task, validate_task, write_task) tuple.
    """
    # Task 1: Deep Discovery & Intelligence Gathering (System 2)
    research_task = Task(
        description="""
        1. Leverage System 2 reasoning and Tree of Thoughts exploration to search for {topic} in 2026.
        2. Instead of a linear search, investigate multiple branches of potential breakthroughs.
        3. Identify 5 high-impact, technically verifiable developments. 
        4. For each finding:
           - Provide a sophisticated technical breakdown (min 100 words per point).
           - Provide at least one LEGITIMATE, specific source URL.
        5. REFLECTION LOOP: Before finalizing, self-audit for placeholders or low-depth marketing buzz. 
        """,
        expected_output="A high-depth intelligence dossier with 5 validated findings and verified technical citations.",
        agent=researcher
    )

    # Task 2: Adversarial Validation & Reliability Audit (Reflexion)
    validate_task = Task(
        description="""
        1. Conduct a 'Reflexion' loop on the Discovery Specialist's dossier. 
        2. Act as an adversarial judge: Challenge the technical validity of each claim.
        3. Audit every URL for dead links or placeholders. 
        4. If a claim is weak, force a re-evaluation or discard it for a more robust one.
        5. Standardize citations into professional markdown [Title](URL).
        """,
        expected_output="A bulletproof, verified set of technical insights ready for executive synthesis.",
        agent=validator
    )

    # Task 3: Cognitive Report Synthesis & Strategic Outlook
    write_task = Task(
        description="""
        1. Synthesize the verified intelligence into a premium, strategic technical report.
        2. Architecture must include:
           - **Executive Intel Brief**: High-level impact summary.
           - **Technical Deep-Dive**: Layered analysis of the 5 findings with deep-linked citations.
           - **Cognitive Forecast**: Long-term strategic implications for the industry.
        3. ZERO TOLERANCE for placeholders like '[URL]'. Integrate all links naturally.
        """,
        expected_output="A boardroom-ready strategic report (600-800 words) with perfect technical integrity.",
        agent=writer
    )

    return research_task, validate_task, write_task
