from crewai import Task


def create_tasks(researcher, writer, validator):
    """Create all tasks with the given agents.

    Returns (research_task, validate_task, write_task) tuple.
    """
    # Task 1: Research Phase
    research_task = Task(
        description="""
        1. Conduct a deep-dive search into {topic} for the year 2026.
        2. Identify 5 key trends, challenges, or breakthroughs.
        3. Provide brief summaries for each point and include source URLs.
        4. Ensure the data is technically accurate and recent.
        """,
        expected_output="A structured list of 5 key research findings with supporting URLs and summaries.",
        agent=researcher
    )

    # Task 2: Validation Phase
    validate_task = Task(
        description="""
        1. Review the research findings provided by the Lead Researcher.
        2. Check the logical consistency and accuracy of the data.
        3. Extract the exact URLs and generate beautifully formatted proper citations for each finding.
        4. Provide the validated fact list alongside their corresponding exact citations to be used by the Writer.
        """,
        expected_output="A robust, verified list of facts with their respective proper citations.",
        agent=validator
    )

    # Task 3: Writing Phase
    write_task = Task(
        description="""
        1. Review the research findings provided by the Lead Researcher.
        2. Expand the findings into a professional markdown report.
        3. The report must include: 
           - An "Executive Summary" section.
           - A "Detailed Analysis" section.
           - A "Future Outlook" section.
        4. Use clean Markdown formatting with headers, bold text, and bullet points.
        """,
        expected_output="A final, publication-ready markdown report containing approximately 500-700 words.",
        agent=writer
    )

    return research_task, validate_task, write_task
