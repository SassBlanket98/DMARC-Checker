#!/usr/bin/env python3
"""
Test script for the enhanced DMARC Checker API
"""
import requests
import json
import sys

def test_ip_api(ip_address):
    """Test the IP info API endpoint"""
    try:
        print(f"Testing IP: {ip_address}")
        response = requests.get(f'http://localhost:5000/api/ip-info?ip={ip_address}', timeout=30)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Response received successfully")
            print(f"IP: {data.get('ip', 'N/A')}")
            print(f"Is Bogon: {data.get('is_bogon', 'N/A')}")
            print(f"Location: {data.get('location', {}).get('city', 'N/A')}, {data.get('location', {}).get('country', 'N/A')}")
            
            # Check external reputation sources
            external_sources = data.get('external_reputation_sources', [])
            print(f"External Sources Found: {len(external_sources)}")
            for source in external_sources:
                print(f"  - {source.get('source', 'Unknown')}: {source.get('status', 'Unknown')}")
            
            # Check overall reputation
            overall_rep = data.get('overall_calculated_reputation', {})
            if overall_rep:
                print(f"Overall Reputation Score: {overall_rep.get('score', 'N/A')}/100")
                print(f"Reputation Level: {overall_rep.get('level', 'N/A')}")
            else:
                print("No overall reputation calculated")
                
            # Check DNSBL results
            dnsbl_results = data.get('dnsbl_results', [])
            print(f"DNSBL Checks: {len(dnsbl_results)} performed")
            blacklisted = [result for result in dnsbl_results if result.get('blacklisted', False)]
            if blacklisted:
                print(f"⚠️  Found on {len(blacklisted)} blacklists")
            else:
                print("✅ Not found on any blacklists")
                
        else:
            print(f"❌ Error response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def main():
    print("=== DMARC Checker Enhanced API Test ===\n")
    
    # Test with Google DNS (should be clean)
    test_ip_api("8.8.8.8")
    print("\n" + "="*50 + "\n")
    
    # Test with localhost (should be bogon)
    test_ip_api("127.0.0.1")

if __name__ == "__main__":
    main()
