import os
import re
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from crawl4ai import AsyncWebCrawler
import asyncio
from langchain_openrouter import ChatOpenRouter
from pydantic import BaseModel, Field
import json
import serpapi

load_dotenv()

topics_finda_helpline = [
    "Suicidal Thoughts",
    "Abuse & domestic violence",
    "Anxiety",
    "Bullying",
    "Dementia & Alzheimers",
    "Depression",
    "Eating & body image",
    "Family",
    "Grief & loss",
    "Loneliness",
    "Parenting",
    "Physical illness",
    "Pregnancy & abortion",
    "Relationships",
    "School & work",
    "Self-harm",
    "Sexual abuse",
    "Stress",
    "Substance use",
    "Suicide",
    "Supporting others",
    "Trauma & PTSD"
]

india_fallback_helplines = {
    "Universal Emergency": {
        "112": "Unified Emergency Number (Police, Fire, Ambulance) — 24/7, nationwide",
        "100": "Police",
        "101": "Fire Services",
        "102": "Ambulance",
        "108": "Disaster Management & Emergency Response"
    },
    "Women & Children": {
        "181": "Women Helpline (Domestic Abuse, Distress, Shelter) — 24/7",
        "1091": "Women in Distress Helpline — All India",
        "1098": "Childline — Children in distress, abuse, shelter, nutrition — 24/7",
        "1094": "Deputy Commissioner of Police — Missing Child & Women",
        "7827-170-170": "National Commission for Women (NCW)",
        "14567": "Elder Line — Senior citizens: health, legal aid, abuse, rescue"
    },
    "Mental Health": {
        "14416": "Tele-MANAS — National Tele Mental Health Programme, 20 languages, 24/7",
        "1800-891-4416": "Tele-MANAS (toll-free alternate)",
        "1800-599-0019": "KIRAN — Mental health support & rehabilitation"
    },
    "Medical & Health": {
        "104": "National Health Mission (NHM) Helpline",
        "14555": "Ayushman Bharat Jan Arogya Helpline",
        "1066": "Anti-Poison Helpline (New Delhi)",
        "011-26593677": "National Poison Information Centre, AIIMS",
        "011-26589391": "National Poison Information Centre (alt)",
        "1800-116-117": "National Poison Information Centre (toll-free)",
        "1910": "Indian Red Cross Society — Blood Bank & Emergency"
    },
    "Disaster Management": {
        "1078": "NDMA Disaster Management Helpline",
        "1070": "Relief Commissioner for Natural Calamities",
        "011-2670-1728": "NDMA Control Room (Delhi)",
        "011-2436-3260": "NDRF Headquarters",
        "97110-77372": "NDRF Helpline"
    },
    "Legal & Rights": {
        "011-2338-2427": "National Legal Services Authority (NALSA) — Free legal aid",
        "011-2338-4354": "NALSA (alternate)",
        "011-2338-5368": "National Human Rights Commission (NHRC)",
        "011-2334-0891": "NHRC (alternate)",
        "1800-419-8588": "Anti-Trafficking Helpline",
        "155260": "Cyber Crime Helpline",
        "1930": "Cyber Crime (alternate)"
    },
    "Substance Use & Addiction": {
        "14446": "National De-addiction Helpline — Counseling & referral, 24/7",
        "1800-11-0031": "National Helpline for De-addiction (Alcohol & Drugs)",
        "1800-112-356": "National Tobacco Quit Line Services (NTQLS)"
    },
    "Financial & Utilities": {
        "1912": "Electricity Complaint Helpline (most states)",
        "1906": "LPG Leak Helpline",
        "1800-180-1111": "PM Jan Dhan Yojana — Banking & financial inclusion",
        "155261": "PM-Kisan Helpline — Farmers' income support"
    }
}


class NationalHelpline(BaseModel):
    number: int | None = Field(default=None, description="The national helpline phone number from the dict, or None if not found")
    confidence: float = Field(description="Confidence that this number resolves the user's query (0.0–1.0)")


class JsonClass(BaseModel):
    Topic: str = Field(description="Classified crisis topic from the findahelpline list or helplines dict. Use the exact name as listed.")
    Location: str | None = Field(default=None, description="City or location mentioned by the user. Output None if no location mentioned.")
    location_query: str = Field(description="Google Maps search query to find help places for the user's crisis. CRITICAL: must be accurate. Use + separated words. Search for non-profit, free, government, or social service organizations — NOT commercial businesses.")
    need_for_national_helpline: bool = Field(description="True if the user's situation needs a national helpline to resolve it")
    national_helplinenumber: NationalHelpline | None = Field(default=None, description="National helpline number and its confidence, looked up from the helplines dict")
    Overall_confidence_threshold: float = Field(description="Overall confidence in the classification (0.0–1.0)")

schema = json.dumps(JsonClass.model_json_schema(), indent=2)

model = ChatOpenRouter(model="nvidia/nemotron-3-nano-30b-a3b:free", temperature=0.8)

template = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a crisis response assistant. The user is in a real-life catastrophe and needs urgent help — this is NOT a commercial or advisory query. Your goal is to connect them to social welfare, free legal aid, government helplines, NGOs, shelters, and crisis support services.

Available findahelpline topics: {topics}
Available India helplines: {helplines}

Output JSON matching this exact schema: {schema}

Rules:
- Always stick to the JSON schema. No markdown, no extra text — valid JSON only.
- Rate Overall_confidence_threshold 0.0-1.0. If below 0.6, respond with all fields as null/None/empty.
- For the Topic field: match it EXACTLY from the findahelpline topics list or the helplines dict category names.
- For the location_query field: this is THE MOST CRITICAL field. Think like a social crisis responder. Generate a Google Maps search query that would return NON-PROFIT, FREE, GOVERNMENT, or SOCIAL SERVICE organizations — NOT commercial businesses. Examples:
  * "financial+help" → "electricity+bill+subsidy+office" or "free+food+ration+center"
  * "mental+health" → "free+mental+health+clinic" or "Tele+MANAS+counseling"
  * "legal+rights" → "free+legal+aid+society"
  * Never output generic queries like "Financial+Utilities" — that returns financial advisors.
  * NEVER confuse Location (where the user is) with location_query (what to search on Google Maps).
- For need_for_national_helpline: set to True if the user's situation is urgent or emergency. Most crisis queries should be True.
- For national_helplinenumber: look through the helplines dict. If you find a matching number for the user's crisis, output it with a confidence score. If none matches, set number to null.
- For Overall_confidence_threshold: rate how confident you are in the entire classification from 0.0 to 1.0."""
    ),
    (
        "human",
        "{user_input}"
    )
])

chain = template | model

user_query = input("what crisis are you facing?")

response = chain.invoke({
    "schema": schema,
    "topics": json.dumps(topics_finda_helpline, indent=2),
    "helplines": json.dumps(india_fallback_helplines, indent=2),
    "user_input": user_query
})

llm_output = response.content.strip()
if llm_output.startswith("```"):
    llm_output = llm_output.strip("`").removeprefix("json").strip()
parsed = JsonClass.model_validate(json.loads(llm_output))

print(f"Topic: {parsed.Topic}")
print(f"Location: {parsed.Location}")
print(f"Location query (Google Maps): {parsed.location_query}")
print(f"Need national helpline: {parsed.need_for_national_helpline}")
if parsed.national_helplinenumber:
    print(f"National helpline number: {parsed.national_helplinenumber.number} (confidence: {parsed.national_helplinenumber.confidence})")
else:
    print("National helpline number: None")
print(f"Overall confidence: {parsed.Overall_confidence_threshold}")


def extract_phone_numbers(text: str) -> list[str]:
    pattern = re.compile(
        r'(?:\+?91[-\s]?)?(?:0[-\s]?)?'
        r'(?:\d{10}|\d{4,5}[-\s]?\d{5,6}|\d{3,4}[-\s]?\d{3,4}[-\s]?\d{4})'
    )
    return list(set(pattern.findall(text)))


def search_helpline_numbers(topic: str):
    should_search_web = (
        parsed.need_for_national_helpline and
        (parsed.national_helplinenumber is None or parsed.national_helplinenumber.confidence < 0.6)
    )

    if not should_search_web:
        print("\n=== National Helpline ===")
        if parsed.national_helplinenumber and parsed.national_helplinenumber.number:
            print(f"Using LLM-provided number: {parsed.national_helplinenumber.number} (confidence: {parsed.national_helplinenumber.confidence})")
        else:
            print("No national helpline needed or confidence too low to search.")
        return

    print("\n=== National Helpline Web Search ===")
    print(f"Crisis topic: {topic}")
    print(f"Confidence below 0.6, searching web for helpline numbers...")

    topic_lower = topic.lower()
    matched_fallback = {}
    for category, entries in india_fallback_helplines.items():
        for num, desc in entries.items():
            if topic_lower in desc.lower() or any(
                w in desc.lower() for w in topic_lower.replace("&", "").split()
            ):
                matched_fallback.setdefault(category, {})[num] = desc

    if matched_fallback:
        print("\nMatches from India fallback helplines:")
        for cat, nums in matched_fallback.items():
            print(f"  [{cat}]")
            for num, desc in nums.items():
                print(f"    {num}: {desc}")

    serp_key = os.getenv("SERP_API_KEY")
    all_numbers = set()

    if not serp_key:
        print("\nSERP_API_KEY not set, skipping web search.")
        if not matched_fallback:
            print("\nNo helpline numbers found from any source.")
        return

    try:
        client = serpapi.Client(api_key=serp_key)

        google_results = client.search({
            "engine": "google",
            "q": f"{topic} helpline India phone number",
            "num": 5
        })
        text = ""
        for r in google_results.get("organic_results", []):
            text += r.get("snippet", "") + " " + r.get("link", "") + " "
        nums = extract_phone_numbers(text)
        all_numbers.update(nums)
        if nums:
            print("\nHelplines from Google search (SerpAPI):")
            for n in nums:
                print(f"  {n}")

        duckduckgo_results = client.search({
            "engine": "duckduckgo",
            "q": f"{topic} helpline India",
            "kl": "in-en"
        })
        ddg_text = ""
        for r in duckduckgo_results.get("organic_results", []):
            ddg_text += r.get("snippet", "") + " " + r.get("link", "") + " "
        ddg_nums = extract_phone_numbers(ddg_text)
        new_nums = [n for n in ddg_nums if n not in all_numbers]
        all_numbers.update(ddg_nums)
        if new_nums:
            print("\nHelplines from DuckDuckGo search (SerpAPI):")
            for n in sorted(new_nums):
                print(f"  {n}")

    except Exception as e:
        print(f"\nWeb search error: {e}")

    if not matched_fallback and not all_numbers:
        print("\nNo helpline numbers found from any source.")


async def get_help_forquery(topic: str, location_query: str, location: str | None):
    search_helpline_numbers(topic)

    print("\n=== Helpline Organizations (findahelpline) ===")
    if topic in topics_finda_helpline:
        helpline_find_url = f"https://findahelpline.com/countries/in/topics/{topic}"
        try:
            async with AsyncWebCrawler() as crawler:
                result = await crawler.arun(url=helpline_find_url)
                print(result.markdown)
        except Exception as e:
            print(f"Failed to crawl findahelpline: {e}")
    else:
        print(f"Topic '{topic}' not in findahelpline topics list. Skipping.")

    print("\n=== Top Places Nearby ===")
    serp_key = os.getenv("SERP_API_KEY")
    if not serp_key:
        print("SERP_API_KEY not set, skipping Google Maps search.")
        return

    try:
        client = serpapi.Client(api_key=serp_key)
        results = client.search({
            "engine": "google_maps",
            "q": location_query,
            "type": "search"
        })
        for i, place in enumerate(results.get("local_results", [])[:10], 1):
            print(f"{i}. {place.get('title', 'N/A')}")
            print(f"   Phone: {place.get('phone', 'N/A')}")
            print(f"   Website: {place.get('website', 'N/A')}")
            print()
    except Exception as e:
        print(f"Google Maps search error: {e}")

asyncio.run(get_help_forquery(parsed.Topic, parsed.location_query, parsed.Location))


def generate_guidance(user_query: str, helpline_number: int | None, places: list[dict]) -> str:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    prompt_path = os.path.join(script_dir, "..", "systemprompt.txt")
    try:
        with open(prompt_path) as f:
            system_prompt = f.read()
    except FileNotFoundError:
        system_prompt = "You are a compassionate crisis guidance assistant."
    except Exception:
        system_prompt = "You are a compassionate crisis guidance assistant."

    helpline_context = f"Helpline number: {helpline_number}" if helpline_number else "No specific helpline number identified."
    places_context = "\n".join(
        f"- {p.get('name', 'N/A')} | Phone: {p.get('phone', 'N/A')} | Website: {p.get('website', 'N/A')}"
        for p in (places or [])
    ) if places else "No nearby places found."
    fallback_context = json.dumps(india_fallback_helplines, indent=2)

    guidance_template = ChatPromptTemplate.from_messages([
        ("system", system_prompt + "\n\nFALLBACK_NUMBERS = {fallback}\nSEARCH_RESULTS = {places}\nUSER_QUERY = {query}\nUSER_LOCATION = {location}"),
        ("human", "I'm facing: {user_input}")
    ])

    guidance_chain = guidance_template | model
    result = guidance_chain.invoke({
        "fallback": fallback_context,
        "places": places_context,
        "query": user_query,
        "location": parsed.Location or "unknown",
        "user_input": user_query
    })

    return result.content.strip()
