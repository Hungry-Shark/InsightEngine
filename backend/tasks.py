from crewai import Task


def create_tasks(researcher, writer, validator):
    """Create all tasks with the given agents.

    Returns (research_task, validate_task, write_task) tuple.
    """
    # Task 1: Research Phase
    research_task = Task(
        description="""
        1. Conduct an exhaustive search into {topic} for the current year (2026).
        2. Identify exactly 5 high-impact trends, breakthroughs, or technical developments.
        3. For each point:
           - Provide a concise technical summary.
           - Provide at least one VERIFIABLE, real-world source URL.
        4. CRITICAL: Do not use placeholders. If a specific URL cannot be found, find a different point that has a verifiable source.
        """,
        expected_output="A list of 5 validated research findings, each with a corresponding legitimate source URL.",
        agent=researcher
    )

    # Task 2: Validation & Citation Audit
    validate_task = Task(
        description="""
        1. Audit the 5 research findings provided by the Lead Researcher.
        2. Cross-check the technical accuracy and ensure the URLs provided are real and relevant.
        3. Standardize all citations into a beautiful Markdown format (e.g., [Source Name](URL)).
        4. If any placeholder URLs (like '[URL]') are found, flag them and attempt to find the correct one or remove the unsubstantiated claim.
        """,
        expected_output="A bulletproof list of 5 verified facts, each with a perfectly formatted, clickable Markdown citation.",
        agent=validator
    )

    # Task 3: Professional Report Synthesis
    write_task = Task(
        description="""
        1. Use the verified facts and citations from the Auditor to construct a premium report.
        2. The report MUST include: 
           - **Executive Summary**: A high-level overview.
           - **Deep Dive Analysis**: Detailed exploration of the 5 findings with inline citations.
           - **Strategic Outlook**: Future implications for 2026 and beyond.
        3. MANDATORY: Never include the text '[URL]'. All sources must be integrated as clickable links within the text or in a dedicated 'References' section at the end.
        """,
        expected_output="A publication-quality markdown report (500-700 words) with integrated, real-world citations.",
        agent=writer
    )

    return research_task, validate_task, write_task
