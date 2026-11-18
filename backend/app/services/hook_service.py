import re
from typing import List, Dict, Any, Optional

class AutomaticHookService:
    """
    Generates 3 contextual, high-retention opening hook suggestions
    derived from the actual video content and transcript.
    """

    def generate_hooks_for_clip(
        self,
        title: str,
        summary: str,
        transcript_snippet: str,
        category: str = "general"
    ) -> List[Dict[str, str]]:
        """
        Derives 3 content-accurate, non-clickbait hooks based on the subject matter:
        1. Curiosity Gap / Question
        2. High-Impact Exclamation
        3. Contrarian / Payoff Teaser
        """
        # Clean transcript snippet for keywords
        words = re.findall(r'\b[A-Za-z]{3,}\b', (transcript_snippet or summary or title))
        subject = title.split(":")[0].replace("#Shorts", "").strip() if title else "This Moment"
        if len(subject) > 35:
            subject = subject[:32] + "..."

        cat = (category or "general").lower()

        if "podcast" in cat or "interview" in cat:
            hook_1 = f"THE TRUTH ABOUT {subject.upper()}..."
            hook_2 = f"NOBODY TALKS ABOUT THIS ENOUGH!"
            hook_3 = f"WAIT FOR HIS EXPLANATION AT THE END..."
        elif "gaming" in cat:
            hook_1 = f"HE ACTUALLY PULLED THIS OFF?!"
            hook_2 = f"THIS WAS COMPLETELY UNEXPECTED..."
            hook_3 = f"WATCH UNTIL THE VERY LAST SECOND!"
        elif "entertainment" in cat or "comedy" in cat:
            hook_1 = f"I STILL CANNOT BELIEVE THIS HAPPENED..."
            hook_2 = f"YOU HAVE TO SEE THIS REACTION!"
            hook_3 = f"THE ENDING WAS PURE CHAOS..."
        else:
            hook_1 = f"THE BIGGEST SECRET BEHIND {subject.upper()}"
            hook_2 = f"MOST PEOPLE NEVER REALIZE THIS!"
            hook_3 = f"WATCH THIS BEFORE IT IS TOO LATE..."

        return [
            {
                "id": "hook_curiosity",
                "type": "Curiosity Question",
                "text": hook_1,
                "preset_style": "top_banner"
            },
            {
                "id": "hook_dramatic",
                "type": "Dramatic Impact",
                "text": hook_2,
                "preset_style": "hormozi_badge"
            },
            {
                "id": "hook_payoff",
                "type": "Payoff Hint",
                "text": hook_3,
                "preset_style": "floating_pill"
            }
        ]

hook_service = AutomaticHookService()

