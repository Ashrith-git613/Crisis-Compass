### Purpose : To completely build the feature of finding relevant help places for user query 

### Steps 
1. You have to redesign the whole architecture as i describe now in a complete manner using python + langchain . 

### New Architecture 
1. Find a helpline 
    - ``` python 
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
- create a python list of all of these topics. 

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
- a dict with major helplines also like i hav given has to be added to the file. 

2. llm query classification 
    a. you invoke a chain with user query and these list and dict. this will be its context . 
        - use langchain chain invoke feature. 
        - set the model to be "nvidia/nemotron-3-nano-30b-a3b:free" - ChatOpenrouter
        - detailed system prompt to the chian model to output the following from user query . 
            1. Topic : str - the topic of the user query. (if this is within the list or dict , then return from it as is. only the topic name. this tells us what type of issue the user is facing, )
            2. Location : str - if user mentions location in his query , then we will output that. else return None 
            3. location query. - this is the most important and has to be most accurate. (you have to interpret the users crisis in a query and search it on google maps with that query to find help places. 
                                 this is very crucial as if wrong query is given , wrong places for help will be fetched which will be of no use. so make sure llm outputs right location query. dont confuse location query with location. - location is where the user is and location query is what to search on gmpas to find places for help for the user. )
            4. need_for_national_helpline : bool - if user query needs a national helpline to resolve it , output true. 
            5. national_helplinenumber : int - when user query needs a helpline , it has to look through the dict and output mainly 2 things. 
                a. helpline number (if found in the dict for the user query in topics of dict. else none. )
                b. confidence threshold. - how confident the model is that this number resolves the user query (int btwn 0-1)
            6. Overall_confidence_treshhold : int from 0-1 - what does the model rate its clasiification from 0-1 and how confident it is that this location query and the classification it has done is correct/
    b. model must exactly respond in this json format - use pydantic json schemas and strict the model to output this json. 

3. now comes the main architecture. 
- user enters a query. 
- in national_helplinenumber - if the confidence threshold is below 0.6 then this has to happen. 
    - use serp api to webfecth and search :helpline numbers for {topic} which chain gave as output. then get those helpline numbers. 
- find a helpline as well as google maps with serp api run at the same time. 
- both get helplines . 
    - find a helpline runs only if the topic of user query is within the list that we gave for find a helpline else no. 
    - gmaps runs on the location query outputted by the model. 

4. output format. 
    10 places where i can reach out for help with their phone number and website and name. 