#!/usr/bin/env python3
"""
Test API caching performance
"""
import requests
import time

def test_api_caching():
    print('Testing API with caching...')
    
    try:
        # First call
        start_time = time.time()
        response = requests.get('http://localhost:5000/api/ip-info?ip=1.1.1.1', timeout=30)
        first_call_time = time.time() - start_time
        print(f'First call: {response.status_code} in {first_call_time:.2f}s')
        
        # Small delay
        time.sleep(1)
        
        # Second call should be faster due to caching
        start_time = time.time()
        response2 = requests.get('http://localhost:5000/api/ip-info?ip=1.1.1.1', timeout=30)
        second_call_time = time.time() - start_time
        print(f'Second call: {response2.status_code} in {second_call_time:.2f}s')
        
        # Check if external sources are included
        if response.status_code == 200:
            data = response.json()
            external_sources = data.get('external_reputation_sources', [])
            print(f'External sources found: {len(external_sources)}')
            for source in external_sources:
                print(f'  - {source.get("source", "Unknown")}: {source.get("status", "Unknown")}')
        
        if second_call_time < first_call_time * 0.7:
            print('✅ Caching appears to be working!')
        else:
            print('⚠️  Second call not significantly faster, caching may not be working')
            
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_api_caching()
