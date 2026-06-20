import os
import re
import json
import asyncio
import base64
from io import BytesIO
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_openrouter import ChatOpenRouter
from crawl4ai import AsyncWebCrawler
import serpapi
import qrcode
from qrcode.image.pil import PilImage

load_dotenv()

app = FastAPI(title="Crisis Compass API")

FRONTEND_ORIGINS = [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://192.168.0.187:8081",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

topics_finda_helpline = [
    "Suicidal Thoughts", "Abuse & domestic violence", "Anxiety", "Bullying",
    "Dementia & Alzheimers", "Depression", "Eating & body image", "Family",
    "Grief & loss", "Loneliness", "Parenting", "Physical illness",
    "Pregnancy & abortion", "Relationships", "School & work", "Self-harm",
    "Sexual abuse", "Stress", "Substance use", "Suicide",
    "Supporting others", "Trauma & PTSD"
]

india_fallback_helplines = {
    "Universal Emergency": {
        "112": "Unified Emergency Number (Police, Fire, Ambulance) — 24/7, nationwide",
        "100": "Police", "101": "Fire Services", "102": "Ambulance",
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
        "14555": "Ayushman Bharat Jan Arogya Helpline", "1066": "Anti-Poison Helpline (New Delhi)",
        "011-26593677": "National Poison Information Centre, AIIMS",
        "011-26589391": "National Poison Information Centre (alt)",
        "1800-116-117": "National Poison Information Centre (toll-free)",
        "1910": "Indian Red Cross Society — Blood Bank & Emergency"
    },
    "Disaster Management": {
        "1078": "NDMA Disaster Management Helpline",
        "1070": "Relief Commissioner for Natural Calamities",
        "011-2670-1728": "NDMA Control Room (Delhi)",
        "011-2436-3260": "NDRF Headquarters", "97110-77372": "NDRF Helpline"
    },
    "Legal & Rights": {
        "011-2338-2427": "National Legal Services Authority (NALSA) — Free legal aid",
        "011-2338-4354": "NALSA (alternate)",
        "011-2338-5368": "National Human Rights Commission (NHRC)",
        "011-2334-0891": "NHRC (alternate)",
        "1800-419-8588": "Anti-Trafficking Helpline",
        "155260": "Cyber Crime Helpline", "1930": "Cyber Crime (alternate)"
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

# --- Pydantic schema for LLM output ---
class NationalHelplineOut(BaseModel):
    number: int | None = None
    confidence: float = 0.0

class JsonClass(BaseModel):
    Topic: str
    Location: str | None = None
    location_query: str
    need_for_national_helpline: bool
    national_helplinenumber: NationalHelplineOut | None = None
    Overall_confidence_threshold: float

class GuidanceStep(BaseModel):
    title: str = Field(description="Short label for the step, e.g. 'CALL THE HELPLINE' or 'REACH NEAREST SHELTER'")
    body: str = Field(description="2-4 sentence explanation of what to do in this step. Be direct and empathetic.")
    action: str = Field(description="The single most important actionable instruction for this step. One sentence.")
    alternative: str = Field(description="If the user says they CANNOT do the primary action, give a concrete fallback alternative they can do instead. One sentence.")

class GuidanceResponse(BaseModel):
    steps: list[GuidanceStep] = Field(description="Exactly 4-6 numbered crisis response steps, each with a title, body explanation, primary action, and a fallback alternative. Cover immediate safety, who to call, where to go, what to bring, and follow-up.")
    call_script: str = Field(description="A highly personalized, direct script for the user to read when calling an NGO, helpline, or emergency number.")
    message_draft: str = Field(description="A short SMS/WhatsApp message summarizing the crisis, location, and request for help.")
    crisis_summary: str = Field(description="A professional 2-3 sentence summary of the user's crisis for showing to NGO workers.")

schema_str = json.dumps(JsonClass.model_json_schema(), indent=2)
guidance_schema_str = json.dumps(GuidanceResponse.model_json_schema(), indent=2)

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
- For the location_query field: this is THE MOST CRITICAL field. Generate a Google Maps search query that finds FREE, GOVERNMENT, or NON-PROFIT crisis services matching the user's specific problem. CRISIS-SPECIFIC QUERY EXAMPLES:
  • Suicidal Thoughts/Mental Health → "psychiatric hospital" or "mental health counselling centre [state/city]"
  • Domestic Abuse → "women shelter" or "one stop centre [state/city]"
  • Homelessness/Eviction → "night shelter" or "rain basera [state/city]"
  • Food/Hunger → "food bank" or "community kitchen [state/city]"
  • Substance Use → "de addiction centre" or "rehabilitation centre [state/city]"
  • Legal Aid → "legal aid office" or "DLSA [state/city]"
  • Medical Emergency → "government hospital" or "free clinic [state/city]"
  • Natural Disaster → "relief camp" or "emergency shelter [state/city]"
  • Child Safety → "child welfare office" or "childline office [state/city]"
  Include the user's state/city in the query when available from their input. The query MUST directly solve the user's crisis — not generic phrases like "non-profit organizations".
- For need_for_national_helpline: set to True if the user's situation is urgent or emergency. Most crisis queries should be True.
- For national_helplinenumber: look through the helplines dict. If you find a matching number for the user's crisis, output it with a confidence score. If none matches, set number to null.
- For Overall_confidence_threshold: rate how confident you are in the entire classification from 0.0 to 1.0."""
    ),
    ("human", "{user_input}")
])

chain = template | model


def extract_phone_numbers(text: str) -> list[str]:
    pattern = re.compile(
        r'(?:\+?91[-\s]?)?(?:0[-\s]?)?'
        r'(?:\d{10}|\d{4,5}[-\s]?\d{5,6}|\d{3,4}[-\s]?\d{3,4}[-\s]?\d{4})'
    )
    return list(set(pattern.findall(text)))


def classify_query(user_query: str, country: str = "") -> dict:
    is_india = country.lower() in ("", "india")
    helplines_context = json.dumps(india_fallback_helplines, indent=2) if is_india else "{}"
    response = chain.invoke({
        "schema": schema_str,
        "topics": json.dumps(topics_finda_helpline, indent=2),
        "helplines": helplines_context,
        "user_input": user_query
    })
    llm_output = response.content.strip()
    if llm_output.startswith("```"):
        llm_output = llm_output.strip("`").removeprefix("json").strip()
    parsed = JsonClass.model_validate(json.loads(llm_output))
    return parsed.model_dump()


def web_search_helplines(topic: str, country: str) -> list[str]:
    serp_key = os.getenv("SERP_API_KEY")
    if not serp_key:
        return []
    all_numbers: set[str] = set()
    try:
        client = serpapi.Client(api_key=serp_key)
        for q in [f"{topic} helpline {country} phone number", f"crisis helpline {country}", f"mental health helpline {country}"]:
            try:
                res = client.search({"engine": "google", "q": q, "num": 5})
                text = ""
                for r in res.get("organic_results", []):
                    text += r.get("snippet", "") + " " + r.get("link", "") + " "
                all_numbers.update(extract_phone_numbers(text))
            except Exception:
                pass
    except Exception:
        pass
    return sorted(all_numbers)


def search_national_helpline(topic: str, need_helpline: bool, helpline_info: dict | None, country: str = "") -> str:
    is_india = country.lower() in ("", "india")

    if not need_helpline:
        return "No national helpline needed."

    if is_india:
        if helpline_info and helpline_info.get("confidence", 0) >= 0.6:
            num = helpline_info.get("number")
            conf = helpline_info.get("confidence")
            if num:
                return f"Using LLM-provided number: {num} (confidence: {conf})"

        result_lines = [f"Crisis topic: {topic}", "Confidence below 0.6, searching web for helpline numbers..."]
        topic_lower = topic.lower()
        matched_fallback = {}
        for category, entries in india_fallback_helplines.items():
            for num, desc in entries.items():
                if topic_lower in desc.lower() or any(
                    w in desc.lower() for w in topic_lower.replace("&", "").split()
                ):
                    matched_fallback.setdefault(category, {})[num] = desc
        if matched_fallback:
            result_lines.append("\nMatches from India fallback helplines:")
            for cat, nums in matched_fallback.items():
                result_lines.append(f"  [{cat}]")
                for num, desc in nums.items():
                    result_lines.append(f"    {num}: {desc}")

        web_nums = web_search_helplines(topic, "India")
        if web_nums:
            result_lines.append("\nHelplines from web search:")
            for n in web_nums:
                result_lines.append(f"  {n}")

        if not matched_fallback and not web_nums:
            result_lines.append("\nNo helpline numbers found from any source.")
        return "\n".join(result_lines)
    else:
        result_lines = [f"Crisis topic: {topic}", f"Country: {country}", "Searching for helpline numbers..."]
        web_nums = web_search_helplines(topic, country)
        if web_nums:
            result_lines.append(f"\nHelplines for {country}:")
            for n in web_nums:
                result_lines.append(f"  {n}")
        else:
            result_lines.append(f"\nNo helpline numbers found for {country}.")
        return "\n".join(result_lines)


async def fetch_places(location_query: str) -> list[dict]:
    serp_key = os.getenv("SERP_API_KEY")
    if not serp_key:
        return []
    try:
        client = serpapi.Client(api_key=serp_key)
        results = client.search({
            "engine": "google_maps",
            "q": location_query,
            "type": "search"
        })
        places = []
        for place in results.get("local_results", [])[:10]:
            places.append({
                "name": place.get("title", "N/A"),
                "phone": place.get("phone", "N/A"),
                "website": place.get("website", "N/A"),
            })
        return places
    except Exception:
        return []


async def fetch_findahelpline(topic: str) -> str:
    if topic not in topics_finda_helpline:
        return f"Topic '{topic}' not in findahelpline topics list."
    try:
        url = f"https://findahelpline.com/countries/in/topics/{topic}"
        async with AsyncWebCrawler() as crawler:
            result = await crawler.arun(url=url)
            return result.markdown[:5000]
    except Exception as e:
        return f"Failed to crawl findahelpline: {e}"


# --- Guidance Agent ---
guidance_model = ChatOpenRouter(model="nvidia/nemotron-3-nano-30b-a3b:free", temperature=0.7)

def load_system_prompt() -> str:
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "systemprompt.txt")
    try:
        with open(path) as f:
            return f.read()
    except Exception:
        return "You are a compassionate crisis guidance assistant."

def generate_qr_base64(text: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(text)
    qr.make(fit=True)
    img = qr.make_image(image_factory=PilImage, fill_color="black", back_color="white")
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

def generate_guidance(user_query: str, topic: str, location: str | None, helpline_number: int | None, places: list[dict], country: str = "") -> dict:
    is_india = country.lower() in ("", "india")
    system_prompt = load_system_prompt()

    if not is_india:
        system_prompt = (
            "IMPORTANT: The user is in " + country + ". Do NOT use Indian helpline numbers.\n"
            + "Use only the numbers provided in FALLBACK_NUMBERS or SEARCH_RESULTS below.\n\n"
            + system_prompt
        )

    places_lines = []
    for i, p in enumerate((places or [])[:10], 1):
        name = p.get("name", "N/A")
        phone = p.get("phone", "N/A")
        website = p.get("website", "N/A")
        line = f"{i}. {name} — Phone: {phone}"
        if website != "N/A":
            line += f", Website: {website}"
        places_lines.append(line)
    places_text = "\n".join(places_lines) if places_lines else "No nearby places found."

    if is_india:
        fallback_text = json.dumps(india_fallback_helplines, indent=2)
    else:
        web_nums = web_search_helplines(topic, country)
        fallback_text = "\n".join(web_nums) if web_nums else f"No fallback numbers found for {country}."

    location_text = location or "unknown"

    full_prompt = (
        system_prompt
        + "\n\nAvailable India helplines fallback: " + fallback_text
        + "\nNearby places from search: " + places_text
        + "\nUser Query: " + user_query
        + "\nUser Location: " + location_text
        + "\n\nCRITICAL: Output ONLY valid JSON matching this exact schema (no markdown, no extra text):\n" + guidance_schema_str
        + "\n\nKEY RULES:"
        + "\n- 'steps': Generate 4-6 steps covering immediate safety, calling helplines, finding shelter, documents to collect, and follow-up."
        + "\n- Each step MUST have a 'title', 'body' (2-4 sentences), 'action' (the primary thing to do NOW), and 'alternative' (what to do if they CANNOT do the primary action — a real fallback, not just 'try again')."
        + "\n- 'call_script': A verbatim script the user reads on the phone to an NGO or helpline."
        + "\n- 'message_draft': A short SMS/WhatsApp message."
        + "\n- 'crisis_summary': 2-3 professional sentences for the intake passport shown to shelter workers."
    )

    from langchain_core.messages import SystemMessage, HumanMessage
    result = guidance_model.invoke([
        SystemMessage(content=full_prompt),
        HumanMessage(content=f"I'm facing: {user_query}"),
    ])
    
    try:
        llm_output = result.content.strip()
        if llm_output.startswith("```"):
            llm_output = llm_output.strip("`").removeprefix("json").strip()
        parsed = GuidanceResponse.model_validate(json.loads(llm_output))
        return parsed.model_dump()
    except Exception as e:
        print(f"Error parsing guidance JSON: {e}")
        # Fallback: wrap the raw text as a single step
        return {
            "steps": [
                {
                    "title": "IMMEDIATE ACTION",
                    "body": result.content.strip(),
                    "action": f"Call the nearest helpline for {topic} immediately.",
                    "alternative": f"If you cannot call, send an SMS to a trusted contact describing your situation in {location_text}."
                }
            ],
            "call_script": f"Hello, I am calling regarding a crisis topic: {topic}. I am in {location_text}. Please assist me.",
            "message_draft": f"I am facing an emergency crisis ({topic}). I need help. Location: {location_text}",
            "crisis_summary": f"User is experiencing a crisis related to {topic} at {location_text}."
        }


class CrisisInputGuidance(BaseModel):
    user_query: str
    topic: str
    location: str | None = None
    helpline_number: int | None = None
    places: list[dict] = []
    country: str = ""


def extract_links_from_markdown(md: str) -> list[dict]:
    if not md:
        return []
    pattern = r'\[([^\]]+)\]\((https?://[^\)]+)\)'
    matches = re.findall(pattern, md)
    links = []
    seen = set()
    for text, url in matches:
        if url not in seen:
            seen.add(url)
            links.append({"title": text.strip(), "url": url.strip()})
    return links

# --- API endpoint ---
class CrisisInput(BaseModel):
    state: str = ""
    country: str = ""
    crisis: str

class CrisisOutput(BaseModel):
    topic: str
    location: str | None
    location_query: str
    need_for_national_helpline: bool
    national_helplinenumber: dict | None
    overall_confidence: float
    helpline_organizations: str
    national_helpline_search: str
    places: list[dict]
    web_links: list[dict] = []


@app.post("/classify")
async def classify_crisis(input_data: CrisisInput) -> CrisisOutput:
    if not input_data.crisis.strip():
        raise HTTPException(status_code=400, detail="Crisis description is required.")

    location_parts = []
    if input_data.state:
        location_parts.append(input_data.state)
    if input_data.country:
        location_parts.append(input_data.country)

    location_str = f" in {', '.join(location_parts)}" if location_parts else ""
    user_query = f"I am{location_str} and I'm facing: {input_data.crisis}"

    is_india = input_data.country.lower() in ("", "india")
    if not is_india:
        user_query += f" (country: {input_data.country})"

    classification = classify_query(user_query, input_data.country)

    national_search = search_national_helpline(
        classification["Topic"],
        classification["need_for_national_helpline"],
        classification.get("national_helplinenumber"),
        input_data.country,
    )

    helpline_orgs = await fetch_findahelpline(classification["Topic"]) if is_india else f"findahelpline only supports India."
    places = await fetch_places(classification["location_query"])
    web_links = extract_links_from_markdown(helpline_orgs)

    return CrisisOutput(
        topic=classification["Topic"],
        location=classification.get("Location"),
        location_query=classification["location_query"],
        need_for_national_helpline=classification["need_for_national_helpline"],
        national_helplinenumber=classification.get("national_helplinenumber"),
        overall_confidence=classification["Overall_confidence_threshold"],
        helpline_organizations=helpline_orgs,
        national_helpline_search=national_search,
        places=places,
        web_links=web_links,
    )


@app.post("/guidance")
async def get_guidance(input_data: CrisisInputGuidance):
    guidance_data = generate_guidance(
        user_query=input_data.user_query,
        topic=input_data.topic,
        location=input_data.location,
        helpline_number=input_data.helpline_number,
        places=input_data.places,
        country=input_data.country,
    )
    
    import random
    from datetime import datetime
    case_id = f"CC-{random.randint(1000, 9999)}"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    passport_text = (
        f"--- CRISIS COMPASS INTAKE PASSPORT ---\n"
        f"Case ID: {case_id}\n"
        f"Generated: {timestamp}\n"
        f"Topic: {input_data.topic}\n"
        f"Location: {input_data.location or 'Unknown'}\n"
        f"----------------------------------------\n"
        f"Summary: {guidance_data['crisis_summary']}\n"
        f"----------------------------------------\n"
        f"Key Contacts:\n"
    )
    if input_data.helpline_number:
        passport_text += f"- National Helpline: {input_data.helpline_number}\n"
    for i, p in enumerate((input_data.places or [])[:3], 1):
        phone_str = f" ({p['phone']})" if p.get('phone') and p['phone'] != 'N/A' else ""
        passport_text += f"- Local {i}: {p['name']}{phone_str}\n"
        
    passport_qr = ""
    try:
        passport_qr = generate_qr_base64(passport_text)
    except Exception as e:
        print(f"Error generating QR: {e}")
        
    return {
        "case_id": case_id,
        "timestamp": timestamp,
        "steps": guidance_data["steps"],
        "call_script": guidance_data["call_script"],
        "message_draft": guidance_data["message_draft"],
        "crisis_summary": guidance_data["crisis_summary"],
        "passport_qr": f"data:image/png;base64,{passport_qr}" if passport_qr else "",
        "passport_text": passport_text
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
