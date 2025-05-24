#!/usr/bin/env python3
"""
Test reputation import
"""
try:
    from reputation import get_complete_ip_info
    print('✅ Import successful')
except Exception as e:
    print('❌ Import failed:', str(e))
    import traceback
    traceback.print_exc()
