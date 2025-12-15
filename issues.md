Issues & Fixes – Development Journey
Here's the complete flow of challenges faced and solutions implemented during AI ServiceFlow development:

🚧 Problem 1: CORS Blocks Frontend → Lambda Calls
Issue: Browser blocked requests with CORS policy errors.
Flow: Lambda responses missing CORS headers → Frontend fetch failed → 403/OPTIONS errors.
Fix: Added full CORS headers to ALL Lambda responses:

python
"headers": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
}
Result: Browser ↔ Lambda communication works seamlessly.

🚧 Problem 2: DynamoDB Decimal → JSON Error
Issue: TypeError: Object of type Decimal is not JSON serializable.
Flow: DynamoDB scan → Decimal numbers → json.dumps() crash → Empty ticket list.
Fix: Custom serializer in getTickets:

python
def decimal_default(obj):
    if isinstance(obj, Decimal): return float(obj)
return json.dumps(data, default=decimal_default)
Result: Tickets display correctly in dashboard.

🚧 Problem 3: Multi-Ticket Detection Failed
Issue: "My printer won't work and my password expired" → Single ticket only.
Flow: Simple keyword check → Missed natural language patterns → Poor multi-issue handling.
Fix: Enhanced detect_multiple_issues():

Added 20+ indicators ("and also", "plus", numbered lists)

Regex separators (1., -, double newlines)

smart_sentence_split() by category (hardware/software/network)
Result: Single prompt → Multiple categorized tickets.

🚧 Problem 4: Wrong Category/Priority Assignment
Issue: "Computer making grinding noise" → Software/Medium instead of Hardware/High.
Flow: Flat keyword matching → Wrong order → Misclassification.
Fix: Priority-based hierarchy:

text
Hardware keywords FIRST → Network → Security → Email → Software → General
High priority FIRST → Medium → Low
Added critical indicators: "grinding", "pop sound", "data loss" = High.
Result: Accurate routing to correct teams.

🚧 Problem 5: Lambda Body Parsing Errors
Issue: JSONDecodeError or missing fields crash.
Flow: API Gateway → String body → json.loads() fail → 500 errors.
Fix: Robust parsing in every Lambda:

python
if isinstance(event.get("body"), str):
    body = json.loads(event["body"])
else:
    body = event.get("body", {})
Result: Handles both direct Lambda URLs and API Gateway.

🚧 Problem 6: Theme Reset on Page Reload
Issue: Dark mode → F5 → Back to light mode.
Flow: Theme state in-memory only → Lost on refresh.
Fix: localStorage persistence:

javascript
// Save
localStorage.setItem('theme', 'dark');
// Load
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.classList.add(savedTheme);
Result: Theme preference survives browser restarts.

🚧 Problem 7: Tickets Not Sorted Chronologically
Issue: Oldest tickets appeared first in dashboard.
Flow: tickets.sort() used wrong/missing field → Reverse chronological broken.
Fix: Standardized timestamps + correct sort:

python
tickets.sort(key=lambda x: x.get("created", ""), reverse=True)
Result: Newest tickets always first.

🚧 Problem 8: GitHub Web Upload → Local Sync Confusion
Issue: Files uploaded via GitHub UI → Local changes wouldn't sync.
Flow: No local git repo → Manual uploads → Version control broken.
Fix: Proper clone workflow:

bash
git clone https://github.com/Sriram2903/AI-Service-Flow.git
cd AI-Service-Flow
# Now edit files locally and:
git add . && git commit -m "Update" && git push
Result: Full git workflow established.

🚧 Problem 9: Voice Assistant Browser Compatibility
Issue: Microphone button visible but silent in Firefox/Safari.
Flow: No Web Speech API detection → Broken UX.
Fix: Feature detection + graceful fallback:

javascript
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    // Enable voice button
} else {
    // Disable + tooltip: "Voice not supported"
}
Result: Works in Chrome/Edge, clean fallback elsewhere.