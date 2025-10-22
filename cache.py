#!/usr/bin/env python3
"""
Simple cache implementation for API results
"""
import time
import json
import hashlib
import os
from typing import Optional, Dict, Any

class SimpleCache:
    """Simple in-memory cache with TTL (Time To Live) support"""
    
    def __init__(self, default_ttl: int = 300):  # 5 minutes default
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl
    
    def _generate_key(self, prefix: str, data: str) -> str:
        """Generate a cache key from prefix and data"""
        return f"{prefix}:{hashlib.md5(data.encode()).hexdigest()}"
    
    def get(self, key: str) -> Optional[Any]:
        """Get item from cache if not expired"""
        if key in self.cache:
            item = self.cache[key]
            if time.time() < item['expires']:
                return item['data']
            else:
                # Remove expired item
                del self.cache[key]
        return None
    
    def set(self, key: str, data: Any, ttl: Optional[int] = None) -> None:
        """Set item in cache with TTL"""
        if ttl is None:
            ttl = self.default_ttl
        
        self.cache[key] = {
            'data': data,
            'expires': time.time() + ttl,
            'created': time.time()
        }
    
    def clear_expired(self) -> None:
        """Clear expired items from cache"""
        current_time = time.time()
        expired_keys = [
            key for key, item in self.cache.items() 
            if current_time >= item['expires']
        ]
        for key in expired_keys:
            del self.cache[key]
    
    def clear_all(self) -> None:
        """Clear all items from cache"""
        self.cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        current_time = time.time()
        active_items = sum(
            1 for item in self.cache.values() 
            if current_time < item['expires']
        )
        expired_items = len(self.cache) - active_items
        
        return {
            'total_items': len(self.cache),
            'active_items': active_items,
            'expired_items': expired_items,
            'memory_usage_estimate': sum(
                len(str(item['data'])) for item in self.cache.values()
            )
        }

# Global cache instances
ip_info_cache = SimpleCache(default_ttl=600)  # 10 minutes for IP info
reputation_cache = SimpleCache(default_ttl=300)  # 5 minutes for reputation data
external_api_cache = SimpleCache(default_ttl=900)  # 15 minutes for external APIs (they're slower to change)
