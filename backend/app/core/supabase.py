from typing import Optional
from backend.app.core.config import settings

# Lazy initialized client
_supabase_client = None

def get_supabase_client():
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client, Client
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            return _supabase_client
        except Exception as e:
            print(f"Warning: Failed to initialize Supabase client: {e}")
            return None
    return None
