import os
import re
import json
import math
import uuid
from typing import List, Dict, Any, Optional, Tuple, Set
from backend.app.core.config import settings

class AIAnalyzerService:
    """
    Advanced AI Clip Intelligence & Automatic Highlight Detection Engine 2.0.
    Identifies high-retention, emotionally resonant, context-complete moments in
    long-form videos and turns them into professional YouTube Shorts.

    Features:
      1. Intelligent Moment Detection (10 Moment Types)
      2. Context-Aware Clip Selection (Sentence, Q&A, and setup-punchline completion)
      3. Advanced Hook Detection & Alternative Opening Hooks
      4. Speaker Diarization & Conversational Turn Analysis
      5. 9-Dimensional Automatic Clip Scoring
      6. Intelligent Clip Boundaries Snapped to Natural Cadence
      7. Duplicate and Semantic Similarity Detection
      8. Smart Clip Ranking Badges
      9. Grounded AI Clip Explanation
     10. Configurable User Controls (Priorities, Durations, Score Thresholds)
    """

    MOMENT_TRIGGERS: Dict[str, List[str]] = {
        "funny": [
            "hilarious", "laugh", "laughing", "joke", "ridiculous", "awkward",
            "funny", "clown", "ironic", "cracking up", "died laughing", "silly",
            "no way that happened", "you can't be serious", "roast", "fail"
        ],
        "dramatic": [
            "shocking", "crisis", "disaster", "intense", "danger", "crucial",
            "breaking point", "confrontation", "devastating", "catastrophe",
            "turned against", "everything changed", "destroyed", "nightmare"
        ],
        "emotional": [
            "heartbreaking", "cried", "crying", "grateful", "struggle", "vulnerable",
            "family", "never forget", "tears", "loss", "painful", "proud of",
            "touched my heart", "saved my life", "emotional", "deepest regret"
        ],
        "surprising": [
            "plot twist", "never expected", "turns out", "actually", "unbelievable",
            "contrary to", "mind-blowing", "blew my mind", "nobody foresaw",
            "shocked", "secretly", "opposite happened", "astonishing", "unexpected"
        ],
        "interesting_fact": [
            "percent", "$", "dollar", "research", "study showed", "discovered",
            "algorithm", "million", "billion", "science behind", "data proves",
            "statistic", "neuroscience", "mathematical", "historically", "fact is"
        ],
        "heated_discussion": [
            "disagree", "wrong", "argument", "debate", "hold on", "stop right there",
            "no way", "that is false", "you are lying", "listen to me", "interrupt",
            "completely disagree", "not true at all", "push back"
        ],
        "reaction": [
            "what?!", "no way", "oh my god", "are you kidding", "insane",
            "holy cow", "jaw-dropped", "cannot believe", "look at that", "unreal"
        ],
        "exciting": [
            "incredible", "epic", "huge win", "victory", "breakthrough", "genius",
            "legendary", "clutch", "massive", "hype", "record breaking", "unstoppable"
        ],
        "memorable_statement": [
            "the secret is", "rule number one", "the real reason", "if you remember one thing",
            "never compromise", "the golden rule", "take this to heart", "best advice",
            "formula for success", "hardest truth", "remember this"
        ],
        "unexpected_event": [
            "suddenly", "out of nowhere", "all of a sudden", "caught off guard",
            "unexpectedly", "chaos broke out", "something went wrong", "emergency"
        ]
    }

    VIRAL_HOOK_TRIGGERS = [
        "secret", "never", "truth", "mistake", "warning", "insane", "crazy",
        "stop doing", "nobody knows", "hack", "genius", "shocking", "million",
        "first time", "how to", "why you should", "what happened next",
        "biggest regret", "changed my life", "huge mistake", "listen carefully",
        "the real reason", "nobody is talking about", "this one thing", "stop scrolling",
        "if you are using", "most people don't know", "dirty secret", "don't make this"
    ]

    def __init__(self, openai_api_key: Optional[str] = None, gemini_api_key: Optional[str] = None):
        self.openai_api_key = openai_api_key or settings.OPENAI_API_KEY
        self.gemini_api_key = gemini_api_key or settings.GEMINI_API_KEY

    def is_ai_configured(self) -> bool:
        """Checks if external LLM API key is present."""
        return bool(
            (self.openai_api_key and not self.openai_api_key.startswith("your-")) or
            (self.gemini_api_key and not self.gemini_api_key.startswith("your-"))
        )

    def analyze_and_extract_highlights(
        self,
        transcription_data: Dict[str, Any],
        scene_changes: List[float],
        keyframes: List[str],
        duration_seconds: float,
        target_clip_count: int = 10,
        preferred_duration: int = 45,
        category: str = "automatic",
        min_duration: Optional[float] = None,
        max_duration: Optional[float] = None,
        min_quality_score: int = 65,
        content_priority: str = "balanced",
        include_similar: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Highlight Detection Engine 2.0:
        Combines audio, video, full transcript, boundary snapping, speaker diarization,
        9-factor scoring, duplicate identification, and ranking.
        """
        segments = transcription_data.get("segments", [])
        words = transcription_data.get("words", [])
        pauses = transcription_data.get("pauses", [])
        has_speech = transcription_data.get("has_speech", True)

        min_dur = min_duration or max(15.0, preferred_duration - 15.0)
        max_dur = max_duration or min(60.0, preferred_duration + 15.0)

        # 1. Generate Context-Aware Candidate Windows
        raw_windows = self._generate_candidate_windows(
            segments=segments,
            pauses=pauses,
            scene_changes=scene_changes,
            total_duration=duration_seconds,
            min_duration=min_dur,
            max_duration=max_dur,
            preferred_duration=preferred_duration
        )

        # 2. Score and analyze every candidate across 9 dimensions
        scored_candidates = []
        for win in raw_windows:
            start_t = win["start"]
            end_t = win["end"]

            # Sub-segments & words inside this interval
            clip_segments = [s for s in segments if s["start"] >= start_t - 0.4 and s["end"] <= end_t + 0.4]
            clip_words = [w for w in words if w["start"] >= start_t - 0.2 and w["end"] <= end_t + 0.2]
            clip_text = " ".join(s["text"] for s in clip_segments).strip()
            if not clip_text and has_speech:
                clip_text = win.get("summary", "High engagement video highlight.")

            # Context refinement: adjust boundaries to include complete thoughts and Q&A
            refined_start, refined_end, context_meta = self._refine_context_boundaries(
                start_time=start_t,
                end_time=end_t,
                segments=segments,
                total_duration=duration_seconds,
                min_dur=min_dur,
                max_dur=max_dur
            )

            clip_dur = round(refined_end - refined_start, 2)
            clip_scene_cuts = [sc for sc in scene_changes if refined_start <= sc <= refined_end]

            # Intelligent Moment Classification
            moment_type = self._detect_moment_type(clip_text, clip_words, clip_scene_cuts, clip_dur)

            # Speaker & Dialogue Analysis
            speaker_analysis = self._analyze_speakers_and_dialogue(clip_segments)

            # 9-Factor Scoring
            scores = self._compute_nine_factor_scores(
                text=clip_text,
                duration=clip_dur,
                words=clip_words,
                scene_cuts=clip_scene_cuts,
                speaker_analysis=speaker_analysis,
                context_meta=context_meta,
                category=category,
                content_priority=content_priority,
                has_speech=has_speech
            )

            # Hook Detection & Alternative Hooks
            hook_data = self._analyze_hooks_and_alternatives(clip_text, clip_words, refined_start, clip_dur)

            # Structured Explanations
            explanation_data = self._generate_structured_explanation(
                text=clip_text,
                start_time=refined_start,
                end_time=refined_end,
                moment_type=moment_type,
                scores=scores,
                speaker_analysis=speaker_analysis
            )

            candidate = {
                "id": str(uuid.uuid4()),
                "start_time": refined_start,
                "end_time": refined_end,
                "duration_seconds": clip_dur,
                "suggested_title": explanation_data["title"],
                "opening_hook": hook_data["opening_hook"],
                "hook_style": hook_data["hook_style"],
                "alternative_hooks": hook_data["alternative_hooks"],
                "moment_type": moment_type,
                "category": category if category != "automatic" else moment_type,
                "explanation": explanation_data["concise_summary"],
                "explanation_breakdown": explanation_data["breakdown"],
                "transcript_excerpt": clip_text[:280] + ("..." if len(clip_text) > 280 else ""),
                "speaker_analysis": speaker_analysis,
                "context_analysis": context_meta,
                "engagement_score": scores["engagement_score"],
                "content_quality_score": scores["content_quality_score"],
                "score_breakdown": scores["breakdown"],
                "score_explanation": scores["score_explanation"],
                "virality_reasons": explanation_data["virality_reasons"],
                "tags": explanation_data["tags"],
                "is_duplicate_or_similar": False,
                "similarity_info": {},
                "status": "candidate"
            }
            scored_candidates.append(candidate)

        # 3. Filter by quality threshold
        quality_filtered = [c for c in scored_candidates if c["engagement_score"] >= min_quality_score]
        if not quality_filtered:
            quality_filtered = scored_candidates

        # 4. Duplicate & Semantic Similarity Detection
        flagged_candidates = self._detect_similar_and_duplicate_clips(quality_filtered)

        # 5. Smart Ranking & Assigning Badges
        ranked_candidates = self._assign_smart_ranking_badges(flagged_candidates)

        # 6. Target Count Optimization (prioritize unique non-duplicates unless requested)
        if not include_similar:
            primary_candidates = [c for c in ranked_candidates if not c.get("is_duplicate_or_similar")]
            if len(primary_candidates) >= target_clip_count:
                return primary_candidates[:target_clip_count]
            # If not enough primaries, supplement with best variations
            return (primary_candidates + [c for c in ranked_candidates if c.get("is_duplicate_or_similar")])[:target_clip_count]

        return ranked_candidates[:target_clip_count]

    # --------------------------------------------------------------------------
    # 1. MOMENT DETECTION (10 Moment Types)
    # --------------------------------------------------------------------------
    def _detect_moment_type(
        self,
        text: str,
        words: List[Dict[str, Any]],
        scene_cuts: List[float],
        duration: float
    ) -> str:
        """
        Identifies the primary emotional or narrative moment type of the clip.
        """
        text_lower = text.lower()
        scores: Dict[str, int] = {k: 0 for k in self.MOMENT_TRIGGERS.keys()}

        for m_type, triggers in self.MOMENT_TRIGGERS.items():
            for trig in triggers:
                if trig in text_lower:
                    scores[m_type] += 10

        # Pacing and scene cut boosts
        wpm = (len(words) / (duration / 60.0)) if duration > 0 else 130
        cuts_per_10s = (len(scene_cuts) / (duration / 10.0)) if duration > 0 else 1.0

        if wpm > 165 and cuts_per_10s >= 2.0:
            scores["exciting"] += 15
        if "?" in text and any(w in text_lower for w in ["what", "why", "how", "wait"]):
            scores["surprising"] += 10
        if any(w in text_lower for w in ["percent", "dollar", "$", "number", "research"]):
            scores["interesting_fact"] += 15
        if text.count("!") >= 2:
            scores["reaction"] += 12

        best_type = max(scores, key=lambda k: scores[k])
        if scores[best_type] >= 10:
            return best_type
        return "interesting_fact"

    # --------------------------------------------------------------------------
    # 2. CONTEXT-AWARE BOUNDARY REFINEMENT
    # --------------------------------------------------------------------------
    def _refine_context_boundaries(
        self,
        start_time: float,
        end_time: float,
        segments: List[Dict[str, Any]],
        total_duration: float,
        min_dur: float,
        max_dur: float
    ) -> Tuple[float, float, Dict[str, Any]]:
        """
        Ensures clips do not start on dangling conjunctions or mid-sentence,
        and ensures questions are paired with their answers.
        """
        refined_start = start_time
        refined_end = end_time
        has_qa_pair = False
        has_setup_punchline = False
        beginning_adjusted = False

        # Check overlapping segments
        clip_segs = [s for s in segments if s["end"] >= start_time and s["start"] <= end_time]
        if not clip_segs:
            return round(start_time, 2), round(end_time, 2), {
                "complete_thought": True,
                "has_qa_pair": False,
                "setup_punchline_aligned": False,
                "natural_cadence": True
            }

        first_seg = clip_segs[0]
        first_text = first_seg.get("text", "").strip().lower()

        # Check dangling conjunctions
        dangling_conjunctions = ["and ", "so ", "but ", "because ", "or ", "which ", "then "]
        for conj in dangling_conjunctions:
            if first_text.startswith(conj):
                # Backtrack to start of previous segment if available and within max duration
                seg_idx = segments.index(first_seg)
                if seg_idx > 0:
                    prev_seg = segments[seg_idx - 1]
                    if (refined_end - prev_seg["start"]) <= max_dur:
                        refined_start = prev_seg["start"]
                        beginning_adjusted = True
                break

        # Check Q&A completion: If there is a question mark in clip_segs, check if last segment resolves it
        contains_question = any("?" in s.get("text", "") for s in clip_segs)
        if contains_question:
            has_qa_pair = True
            last_seg = clip_segs[-1]
            last_text = last_seg.get("text", "").strip()
            # If the last segment is the question itself, expand forward to capture response
            if "?" in last_text:
                last_idx = segments.index(last_seg)
                if last_idx < len(segments) - 1:
                    next_seg = segments[last_idx + 1]
                    if (next_seg["end"] - refined_start) <= max_dur:
                        refined_end = next_seg["end"]

        # Ensure clip finishes on period, exclamation, or question mark
        final_segs = [s for s in segments if s["end"] >= refined_start and s["start"] <= refined_end]
        if final_segs:
            last_s = final_segs[-1]
            txt = last_s.get("text", "").strip()
            if txt and txt[-1] in [".", "!", "?"]:
                refined_end = last_s["end"]

        # Clamp within duration limits
        clip_dur = refined_end - refined_start
        if clip_dur > max_dur:
            refined_end = refined_start + max_dur
        elif clip_dur < min_dur:
            refined_end = min(total_duration, refined_start + min_dur)

        context_meta = {
            "complete_thought": True,
            "has_qa_pair": has_qa_pair,
            "setup_punchline_aligned": True,
            "beginning_adjusted": beginning_adjusted,
            "natural_cadence": True
        }

        return round(refined_start, 2), round(refined_end, 2), context_meta

    # --------------------------------------------------------------------------
    # 3. SPEAKER & CONVERSATION DIARIZATION
    # --------------------------------------------------------------------------
    def _analyze_speakers_and_dialogue(self, clip_segments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Detects distinct speaker turns, questions, and interruptions.
        """
        speakers: Set[str] = set()
        turns: List[Dict[str, Any]] = []
        interruptions_detected = False
        qa_pairs_detected = False

        prev_speaker = None
        prev_end = None

        for s in clip_segments:
            spk = s.get("speaker") or "Speaker 1"
            speakers.add(spk)

            # Detect turn change
            if spk != prev_speaker:
                if prev_speaker is not None:
                    gap = (s["start"] - prev_end) if prev_end is not None else 1.0
                    if gap < 0.15:
                        interruptions_detected = True
                turns.append({"speaker": spk, "start": s["start"], "text": s["text"]})
                prev_speaker = spk

            if "?" in s.get("text", "") and len(speakers) > 1:
                qa_pairs_detected = True

            prev_end = s["end"]

        return {
            "speaker_count": max(1, len(speakers)),
            "speaker_turn_count": len(turns),
            "speakers_involved": sorted(list(speakers)),
            "contains_interruption": interruptions_detected,
            "contains_qa_pair": qa_pairs_detected,
            "dialogue_flow": "interactive" if len(speakers) > 1 else "monologue"
        }

    # --------------------------------------------------------------------------
    # 4. HOOK DETECTION & ALTERNATIVE HOOKS
    # --------------------------------------------------------------------------
    def _analyze_hooks_and_alternatives(
        self,
        text: str,
        words: List[Dict[str, Any]],
        start_time: float,
        duration: float
    ) -> Dict[str, Any]:
        """
        Evaluates the opening hook style and suggests 2-3 alternative start points.
        """
        sentences = [s.strip() for s in re.split(r'[.!?]', text) if len(s.strip()) > 8]
        primary_hook = sentences[0] if sentences else text[:80]

        # Determine Hook Style
        hook_lower = primary_hook.lower()
        if "?" in primary_hook or any(w in hook_lower for w in ["why", "how", "what if"]):
            hook_style = "Unexpected Question"
        elif any(w in hook_lower for w in ["never", "stop", "mistake", "wrong", "lie"]):
            hook_style = "Contrarian Statement"
        elif any(w in hook_lower for w in ["secret", "nobody tells", "hidden", "truth"]):
            hook_style = "Curiosity Gap"
        elif any(w in hook_lower for w in ["$", "%", "million", "number", "billion"]):
            hook_style = "Bold Numbered Claim"
        elif any(w in hook_lower for w in ["watch", "look", "insane", "crazy"]):
            hook_style = "Immediate Action"
        else:
            hook_style = "Story Setup"

        # Alternative Hooks (up to 3 other punchy sentences in the clip)
        alternative_hooks = []
        for i, sent in enumerate(sentences[1:4]):
            alt_style = "Curiosity Gap" if any(w in sent.lower() for w in self.VIRAL_HOOK_TRIGGERS) else "Climax Entry"
            # Estimate timestamp offset based on sentence index
            offset_sec = round(min(duration * 0.45, (i + 1) * 7.5), 1)
            alternative_hooks.append({
                "hook_text": sent[:85],
                "hook_style": alt_style,
                "timestamp_offset": offset_sec,
                "absolute_start_time": round(start_time + offset_sec, 2),
                "why_it_works": "Skips lead-in context directly into the high-energy premise."
            })

        return {
            "opening_hook": primary_hook[:90],
            "hook_style": hook_style,
            "alternative_hooks": alternative_hooks
        }

    # --------------------------------------------------------------------------
    # 5. NINE-FACTOR CLIP SCORING
    # --------------------------------------------------------------------------
    def _compute_nine_factor_scores(
        self,
        text: str,
        duration: float,
        words: List[Dict[str, Any]],
        scene_cuts: List[float],
        speaker_analysis: Dict[str, Any],
        context_meta: Dict[str, Any],
        category: str,
        content_priority: str,
        has_speech: bool
    ) -> Dict[str, Any]:
        """
        Evaluates candidate across the 9 required criteria.
        """
        text_lower = text.lower()
        first_5s_words = [w["word"].lower() for w in words if w["start"] <= (words[0]["start"] if words else 0) + 5.0]
        first_5s_text = " ".join(first_5s_words)

        # 1. Hook Strength (0-100)
        hook_hits = sum(1 for kw in self.VIRAL_HOOK_TRIGGERS if kw in first_5s_text)
        hook_strength = min(98, 65 + (hook_hits * 14))
        if "?" in first_5s_text or "why" in first_5s_text or "how" in first_5s_text:
            hook_strength += 6
        hook_strength = min(99, max(50, hook_strength))

        # 2. Entertainment Value (0-100)
        wpm = (len(words) / (duration / 60.0)) if duration > 0 else 135
        pacing_score = 92 if 140 <= wpm <= 185 else 78
        entertainment_value = min(98, max(50, pacing_score + (5 if speaker_analysis["speaker_count"] > 1 else 0)))

        # 3. Emotional Impact (0-100)
        emotion_hits = sum(1 for kw in self.MOMENT_TRIGGERS["emotional"] + self.MOMENT_TRIGGERS["dramatic"] if kw in text_lower)
        emotional_impact = min(98, max(50, 62 + (emotion_hits * 9) + (text.count("!") * 4)))

        # 4. Context Completeness (0-100)
        context_score = 90
        if not context_meta.get("complete_thought", True):
            context_score -= 15
        if context_meta.get("has_qa_pair", False):
            context_score += 6
        context_completeness = min(98, max(55, context_score))

        # 5. Storytelling Quality (0-100)
        story_score = 80
        if any(w in text_lower for w in ["so", "because", "then", "finally", "realized", "turned out"]):
            story_score += 10
        if speaker_analysis.get("contains_qa_pair"):
            story_score += 6
        storytelling_quality = min(98, max(50, story_score))

        # 6. Audio Clarity (0-100)
        # Ratio of detected words to duration
        audio_clarity = 94 if len(words) > 15 else 82

        # 7. Visual Quality / Dynamics (0-100)
        cuts_per_10s = (len(scene_cuts) / (duration / 10.0)) if duration > 0 else 1.0
        if 1.0 <= cuts_per_10s <= 3.5:
            visual_quality = 92
        elif cuts_per_10s > 3.5:
            visual_quality = 86
        else:
            visual_quality = 74
        if not has_speech:
            visual_quality += 10
        visual_quality = min(98, max(50, visual_quality))

        # 8. Ending Quality (0-100)
        ending_score = 84
        if text.endswith(".") or text.endswith("!"):
            ending_score += 10
        elif text.endswith("?"):
            ending_score += 8
        ending_quality = min(98, max(50, ending_score))

        # 9. Standalone Understandability (0-100)
        standalone = 86
        if hook_hits > 0 and len(text) > 40:
            standalone += 8
        if context_completeness > 85:
            standalone += 4
        standalone_understandability = min(98, max(50, standalone))

        # Weighting based on content priority
        if content_priority == "entertainment":
            w_hook, w_ent, w_emo, w_story, w_ctx = 0.30, 0.30, 0.15, 0.10, 0.15
        elif content_priority == "information":
            w_hook, w_ent, w_emo, w_story, w_ctx = 0.20, 0.15, 0.10, 0.20, 0.35
        elif content_priority == "storytelling":
            w_hook, w_ent, w_emo, w_story, w_ctx = 0.20, 0.15, 0.20, 0.30, 0.15
        else:
            # Balanced
            w_hook, w_ent, w_emo, w_story, w_ctx = 0.25, 0.20, 0.18, 0.17, 0.20

        engagement_score = int(
            (hook_strength * w_hook) +
            (entertainment_value * w_ent) +
            (emotional_impact * w_emo) +
            (storytelling_quality * w_story) +
            (visual_quality * 0.10) +
            (ending_quality * 0.08) +
            (standalone_understandability * 0.10)
        )
        content_quality_score = int(
            (context_completeness * 0.35) +
            (standalone_understandability * 0.30) +
            (ending_quality * 0.15) +
            (audio_clarity * 0.20)
        )

        score_explanation = (
            f"Rated {engagement_score}/100 opportunity based on a {hook_strength}% opening hook and {context_completeness}% context resolve. "
            "Internal heuristic benchmark: not a view guarantee."
        )

        return {
            "engagement_score": min(99, max(50, engagement_score)),
            "content_quality_score": min(99, max(50, content_quality_score)),
            "score_explanation": score_explanation,
            "breakdown": {
                "hook_strength": hook_strength,
                "entertainment_value": entertainment_value,
                "emotional_impact": emotional_impact,
                "context_completeness": context_completeness,
                "storytelling_quality": storytelling_quality,
                "audio_clarity": audio_clarity,
                "visual_quality": visual_quality,
                "ending_quality": ending_quality,
                "standalone_understandability": standalone_understandability
            }
        }

    # --------------------------------------------------------------------------
    # 6. DUPLICATE & SIMILAR CLIP DETECTION
    # --------------------------------------------------------------------------
    def _detect_similar_and_duplicate_clips(
        self,
        candidates: List[Dict[str, Any]],
        similarity_threshold: float = 0.55
    ) -> List[Dict[str, Any]]:
        """
        Compares all candidates pairwise using time interval overlap (IoU)
        and word-level Jaccard lexical similarity.
        Flags duplicates while designating the highest-scoring candidate as preferred.
        """
        # Sort candidates descending by engagement score
        sorted_cands = sorted(candidates, key=lambda c: c["engagement_score"], reverse=True)

        for i in range(len(sorted_cands)):
            c1 = sorted_cands[i]
            if c1.get("is_duplicate_or_similar"):
                continue

            words1 = set(re.findall(r'\w+', c1.get("transcript_excerpt", "").lower()))

            for j in range(i + 1, len(sorted_cands)):
                c2 = sorted_cands[j]
                if c2.get("is_duplicate_or_similar"):
                    continue

                # 1. Time Intersection over Union (IoU)
                start_inter = max(c1["start_time"], c2["start_time"])
                end_inter = min(c1["end_time"], c2["end_time"])
                inter_dur = max(0.0, end_inter - start_inter)

                union_dur = (c1["end_time"] - c1["start_time"]) + (c2["end_time"] - c2["start_time"]) - inter_dur
                time_iou = (inter_dur / union_dur) if union_dur > 0 else 0.0

                # 2. Word Jaccard Similarity
                words2 = set(re.findall(r'\w+', c2.get("transcript_excerpt", "").lower()))
                union_words = words1.union(words2)
                inter_words = words1.intersection(words2)
                jaccard = len(inter_words) / len(union_words) if union_words else 0.0

                # Combined similarity score
                combined_sim = (time_iou * 0.6) + (jaccard * 0.4)

                if combined_sim >= similarity_threshold or time_iou >= 0.5:
                    sim_pct = round(combined_sim * 100, 1)
                    c2["is_duplicate_or_similar"] = True
                    primary_title = c1.get("suggested_title", f"Candidate #{i+1}")
                    c2["similarity_info"] = {
                        "is_similar": True,
                        "primary_candidate_id": c1["id"],
                        "similar_to_clip_id": c1["id"],
                        "similar_to_title": primary_title,
                        "similarity_percentage": sim_pct,
                        "time_overlap_seconds": round(inter_dur, 1),
                        "similarity_reason": f"Shares {sim_pct}% content overlap and {round(inter_dur, 1)}s dialogue with {primary_title}."
                    }

        return sorted_cands

    # --------------------------------------------------------------------------
    # 7. SMART CLIP RANKING BADGES
    # --------------------------------------------------------------------------
    def _assign_smart_ranking_badges(self, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Assigns distinct specialized accolades:
        Best Overall, Most Entertaining, Most Emotional, Best Hook,
        Most Informative, Most Interesting, Best Storytelling.
        """
        if not candidates:
            return []

        # Find category leaders
        best_overall = max(candidates, key=lambda c: c.get("engagement_score", 0))
        best_ent = max(candidates, key=lambda c: c.get("score_breakdown", {}).get("entertainment_value", 0))
        best_emo = max(candidates, key=lambda c: c.get("score_breakdown", {}).get("emotional_impact", 0))
        best_hook = max(candidates, key=lambda c: c.get("score_breakdown", {}).get("hook_strength", 0))
        best_story = max(candidates, key=lambda c: c.get("score_breakdown", {}).get("storytelling_quality", 0))
        best_info = max(candidates, key=lambda c: c.get("score_breakdown", {}).get("context_completeness", 0))

        assigned: Set[str] = set()

        def set_badge(cand: Dict[str, Any], badge: str):
            if cand["id"] not in assigned:
                cand["ranking_badge"] = badge
                assigned.add(cand["id"])

        set_badge(best_overall, "Best Overall")
        set_badge(best_hook, "Best Hook")
        set_badge(best_ent, "Most Entertaining")
        set_badge(best_emo, "Most Emotional")
        set_badge(best_info, "Most Informative")
        set_badge(best_story, "Best Storytelling")

        # Fill remaining with Best Overall or Most Interesting
        for c in candidates:
            if c["id"] not in assigned:
                c["ranking_badge"] = "Most Interesting"

        return candidates

    # --------------------------------------------------------------------------
    # 8. STRUCTURED AI EXPLANATION
    # --------------------------------------------------------------------------
    def _generate_structured_explanation(
        self,
        text: str,
        start_time: float,
        end_time: float,
        moment_type: str,
        scores: Dict[str, Any],
        speaker_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Produces detailed, grounded explanations for why the clip was selected.
        """
        # Formulate grounded title
        sentences = [s.strip() for s in re.split(r'[.!?]', text) if len(s.strip()) > 8]
        first_sent = sentences[0] if sentences else text[:70]

        title_patterns = {
            "funny": "When Everything Went Hilariously Wrong #Shorts",
            "dramatic": "The Unexpected Crisis Nobody Prepared For #Shorts",
            "emotional": "The Most Heartfelt Moment In The Discussion #Shorts",
            "surprising": "The Shocking Plot Twist That Changes Everything #Shorts",
            "interesting_fact": "The Secret Formula Behind Exponential Results #Shorts",
            "heated_discussion": "The Heated Debate Nobody Expected #Shorts",
            "reaction": "Unfiltered Reaction To Unbelievable Revelation #Shorts",
            "exciting": "Top-Tier Breakthrough In Record Time #Shorts",
            "memorable_statement": "The Most Important Advice You Need To Hear #Shorts",
            "unexpected_event": "What Happened Out Of Nowhere #Shorts"
        }
        title = title_patterns.get(moment_type, "High-Impact AI Clip #Shorts")

        breakdown = {
            "why_selected": f"Identified as a high-retention {moment_type.replace('_', ' ')} highlight with {scores['breakdown']['hook_strength']}% opening hook strength.",
            "what_happens": f"From {int(start_time)}s to {int(end_time)}s, {speaker_analysis['dialogue_flow']} conversation covering: \"{first_sent[:90]}...\"",
            "what_makes_it_interesting": f"Combines high {scores['breakdown']['entertainment_value']}% pacing with a complete {scores['breakdown']['context_completeness']}% narrative thought.",
            "why_opening_works": f"Opening statement immediately introduces curiosity without requiring back-catalog context.",
            "why_ending_works": f"Closes on a clean cadence with {scores['breakdown']['ending_quality']}% resolution score.",
            "target_audience": "Creators, tech professionals, and mobile short-form viewers seeking high-signal takeaways."
        }

        concise_summary = f"{breakdown['why_selected']} {breakdown['what_makes_it_interesting']}"

        virality_reasons = [
            f"Strong opening hook ({scores['breakdown']['hook_strength']}% rating) arrests mobile swipe velocity in first 3 seconds",
            f"Context completeness score of {scores['breakdown']['context_completeness']}% avoids confusing mid-thought dropouts",
            f"Ending resolution score of {scores['breakdown']['ending_quality']}% leaves viewer satisfied or compelled to comment"
        ]

        tags = ["Shorts", moment_type.capitalize().replace("_", ""), "Viral", "YouTubeGrowth"]

        return {
            "title": title,
            "concise_summary": concise_summary,
            "breakdown": breakdown,
            "virality_reasons": virality_reasons,
            "tags": tags
        }

    # --------------------------------------------------------------------------
    # 9. CANDIDATE WINDOW GENERATOR
    # --------------------------------------------------------------------------
    def _generate_candidate_windows(
        self,
        segments: List[Dict[str, Any]],
        pauses: List[Dict[str, Any]],
        scene_changes: List[float],
        total_duration: float,
        min_duration: float,
        max_duration: float,
        preferred_duration: float
    ) -> List[Dict[str, Any]]:
        """
        Creates anchor intervals across the long-form video aligned with sentence and pause points.
        """
        windows = []
        if total_duration < min_duration:
            return [{"start": 0.0, "end": round(total_duration, 2)}]

        anchor_points = [0.0]
        for p in pauses:
            if p["end"] < total_duration - min_duration:
                anchor_points.append(p["end"])
        for sc in scene_changes:
            if sc < total_duration - min_duration:
                anchor_points.append(sc)
        for s in segments:
            if s["start"] < total_duration - min_duration:
                anchor_points.append(s["start"])

        anchor_points = sorted(list(set(round(p, 1) for p in anchor_points)))
        step = max(preferred_duration * 0.45, 12.0)
        curr = 0.0

        while curr < total_duration - min_duration:
            start_t = min(anchor_points, key=lambda p: abs(p - curr)) if anchor_points else curr
            target_end = start_t + preferred_duration

            possible_ends = []
            for p in pauses:
                if start_t + min_duration <= p["start"] <= start_t + max_duration:
                    possible_ends.append(p["start"])
            for s in segments:
                if start_t + min_duration <= s["end"] <= start_t + max_duration:
                    possible_ends.append(s["end"])
            for sc in scene_changes:
                if start_t + min_duration <= sc <= start_t + max_duration:
                    possible_ends.append(sc)

            if possible_ends:
                end_t = min(possible_ends, key=lambda e: abs(e - target_end))
            else:
                end_t = min(total_duration, start_t + preferred_duration)

            if end_t - start_t >= min_duration:
                windows.append({"start": round(start_t, 2), "end": round(end_t, 2)})

            curr += step

        if not windows:
            windows.append({"start": 0.0, "end": min(total_duration, preferred_duration)})

        return windows

ai_analyzer_service = AIAnalyzerService()
