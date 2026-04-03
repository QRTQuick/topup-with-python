from copy import deepcopy


TUTORIALS = [
    {
        "slug": "python-foundations",
        "title": "Python Foundations",
        "section": "Free Foundations",
        "level": "Beginner",
        "is_premium": False,
        "duration": "18 mins",
        "summary": "Start clean with syntax, variables, comments, and a practical mental model for Python code.",
        "tags": ["Syntax", "Variables", "Setup"],
        "body": [
            "Install Python, create a virtual environment, and understand how the interpreter executes your script line by line.",
            "Learn naming conventions, built-in types, and how to write readable expressions that scale well as lessons get larger.",
            "Use print debugging intentionally and keep your first scripts small, clear, and easy to refactor.",
        ],
    },
    {
        "slug": "control-flow-masterclass",
        "title": "Control Flow Masterclass",
        "section": "Free Foundations",
        "level": "Beginner",
        "is_premium": False,
        "duration": "22 mins",
        "summary": "Conditionals, loops, list iteration, and the patterns that help beginners stop repeating themselves.",
        "tags": ["if/else", "Loops", "Functions"],
        "body": [
            "Use if, elif, and else blocks to write business rules clearly and avoid nesting traps.",
            "Practice for and while loops with input validation, counters, and collections you will reuse in real projects.",
            "Move repeated logic into functions early so your code stays testable as the platform grows.",
        ],
    },
    {
        "slug": "data-structures-for-builders",
        "title": "Data Structures For Builders",
        "section": "Free Foundations",
        "level": "Intermediate",
        "is_premium": False,
        "duration": "24 mins",
        "summary": "Lists, tuples, sets, and dictionaries explained through app-building examples.",
        "tags": ["Lists", "Dicts", "Sets"],
        "body": [
            "Pick the right collection for the task so you avoid accidental duplication, slow lookups, or hard-to-read loops.",
            "Model app state with dictionaries and nested data in a way that maps cleanly to JSON APIs and database rows.",
            "Use comprehensions responsibly when they improve clarity, and skip them when a normal loop reads better.",
        ],
    },
    {
        "slug": "object-oriented-python",
        "title": "Object-Oriented Python",
        "section": "Premium Advanced Python",
        "level": "Advanced",
        "is_premium": True,
        "duration": "32 mins",
        "summary": "Classes, composition, inheritance, and where OOP genuinely helps in modern Python apps.",
        "tags": ["OOP", "Classes", "Design"],
        "body": [
            "Build classes that encapsulate behavior, not just data containers with decorative syntax.",
            "Prefer composition when it keeps your system easier to test and reason about than deep inheritance trees.",
            "Learn how service classes, repositories, and domain objects fit into real FastAPI projects.",
        ],
    },
    {
        "slug": "decorators-typing-and-testing",
        "title": "Decorators, Typing, and Testing",
        "section": "Premium Advanced Python",
        "level": "Advanced",
        "is_premium": True,
        "duration": "35 mins",
        "summary": "Level up code quality with decorators, type hints, and tests that catch regressions early.",
        "tags": ["Decorators", "Typing", "Pytest"],
        "body": [
            "Understand decorators as functions that wrap behavior, then apply them to auth, logging, and retries.",
            "Use type hints to improve editor feedback and keep team code easier to navigate.",
            "Write focused tests for business logic and API routes so product changes stay safer over time.",
        ],
    },
    {
        "slug": "async-python-in-practice",
        "title": "Async Python In Practice",
        "section": "Premium Advanced Python",
        "level": "Advanced",
        "is_premium": True,
        "duration": "29 mins",
        "summary": "Concurrency, async/await, and where asynchronous code actually pays off in backend apps.",
        "tags": ["Async", "I/O", "Performance"],
        "body": [
            "Learn the difference between concurrency and parallelism before reaching for async everywhere.",
            "Identify I/O-bound operations like network calls and slow database work where async design matters.",
            "Apply async concepts to payment callbacks, third-party APIs, and user-facing latency improvements.",
        ],
    },
    {
        "slug": "fastapi-from-auth-to-payments",
        "title": "FastAPI From Auth To Payments",
        "section": "Premium Libraries & Frameworks",
        "level": "Advanced",
        "is_premium": True,
        "duration": "38 mins",
        "summary": "Build production-shaped APIs with authentication, payments, validation, and structured responses.",
        "tags": ["FastAPI", "JWT", "Payments"],
        "body": [
            "Model request and response schemas with Pydantic and keep route handlers thin and consistent.",
            "Protect routes with JWT auth, hash passwords correctly, and enforce premium access in one place.",
            "Integrate external payment providers with clean service abstractions so you can swap sandbox and live credentials safely.",
        ],
    },
    {
        "slug": "pandas-for-product-metrics",
        "title": "Pandas For Product Metrics",
        "section": "Premium Libraries & Frameworks",
        "level": "Intermediate",
        "is_premium": True,
        "duration": "31 mins",
        "summary": "Analyze learner and payment trends with Pandas so the platform gets smarter over time.",
        "tags": ["Pandas", "Analytics", "Metrics"],
        "body": [
            "Load CSV or SQL data into DataFrames and clean event data for trends you can actually use.",
            "Track premium conversion, tutorial engagement, and retention signals without overcomplicating the first dashboard.",
            "Export summaries for finance, support, and content decisions as the platform grows.",
        ],
    },
]


def list_tutorial_sections() -> list[dict]:
    grouped: dict[str, list[dict]] = {}
    for tutorial in TUTORIALS:
        grouped.setdefault(tutorial["section"], []).append(deepcopy(tutorial))

    descriptions = {
        "Free Foundations": "Core Python lessons learners can open immediately.",
        "Premium Advanced Python": "Deeper language mastery designed for serious builders.",
        "Premium Libraries & Frameworks": "Production-focused work with FastAPI, Pandas, and more.",
    }
    sections = []
    for section_name in descriptions:
        sections.append(
            {
                "name": section_name,
                "description": descriptions[section_name],
                "tutorials": grouped.get(section_name, []),
            }
        )
    return sections


def get_tutorial_by_slug(slug: str) -> dict | None:
    for tutorial in TUTORIALS:
        if tutorial["slug"] == slug:
            return deepcopy(tutorial)
    return None

