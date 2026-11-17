import os
from typing import Dict, Any, Optional

class YouTubePublisherService:
    """
    Manages YouTube Data API v3 OAuth integration, metadata payload formatting,
    and video upload pipeline to YouTube Shorts.
    """

    def __init__(self, client_id: Optional[str] = None, client_secret: Optional[str] = None):
        self.client_id = client_id or os.getenv("YOUTUBE_CLIENT_ID", "")
        self.client_secret = client_secret or os.getenv("YOUTUBE_CLIENT_SECRET", "")

    def is_configured(self) -> bool:
        """Checks if YouTube OAuth credentials are configured in the environment."""
        return bool(self.client_id and self.client_secret)

    def get_auth_url(self, redirect_uri: str, state: str = "") -> str:
        """Generates Google OAuth 2.0 authorization URL for YouTube upload scope."""
        if not self.is_configured():
            return ""
        
        scopes = [
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/userinfo.profile"
        ]
        scope_str = "%20".join(scopes)
        return (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={self.client_id}&"
            f"redirect_uri={redirect_uri}&"
            f"response_type=code&"
            f"scope={scope_str}&"
            f"access_type=offline&"
            f"prompt=consent&"
            f"state={state}"
        )

    def format_shorts_metadata(
        self,
        title: str,
        description: Optional[str],
        tags: list[str],
        visibility: str = "public"
    ) -> Dict[str, Any]:
        """
        Formats YouTube video resource snippet ensuring the #Shorts hashtag is included
        for automatic YouTube Shorts recognition.
        """
        formatted_title = title if "#Shorts" in title else f"{title} #Shorts"
        formatted_tags = list(set(["Shorts", "YouTubeShorts"] + tags))
        full_desc = f"{description or ''}\n\n#Shorts #Viral #AIShortsFactory"
        
        return {
            "snippet": {
                "title": formatted_title[:100],
                "description": full_desc[:5000],
                "tags": formatted_tags[:50],
                "categoryId": "22" # People & Blogs default
            },
            "status": {
                "privacyStatus": visibility.lower(),
                "selfDeclaredMadeForKids": False
            }
        }

youtube_publisher_service = YouTubePublisherService()
