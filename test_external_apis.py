#!/usr/bin/env python3
"""
Simple test for external API integration
"""
import asyncio
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add current directory to path
sys.path.append('.')

from reputation import get_complete_ip_info

async def test_external_apis():
    """Test the external API integrations"""
    print("=== Testing Enhanced IP Reputation System ===\n")
    
    # Test with Google DNS (8.8.8.8)
    test_ip = "8.8.8.8"
    print(f"Testing IP: {test_ip}")
    
    try:
        result = await get_complete_ip_info(test_ip)
        
        print(f"✅ Response received for {result.get('ip', 'Unknown')}")
        print(f"Is Bogon: {result.get('is_bogon', 'Unknown')}")
        
        # Check external reputation sources
        external_sources = result.get('external_reputation_sources', [])
        print(f"External Sources: {len(external_sources)} found")
        
        for source in external_sources:
            source_name = source.get('source', 'Unknown')
            source_status = source.get('status', 'Unknown')
            print(f"  - {source_name}: {source_status}")
            
            # Show some details for each source
            if source_name == 'AbuseIPDB' and 'data' in source:
                abuse_data = source['data']
                confidence = abuse_data.get('abuseConfidencePercentage', 0)
                print(f"    Abuse Confidence: {confidence}%")
                
            elif source_name == 'VirusTotal' and 'data' in source:
                vt_data = source['data']
                rep_score = vt_data.get('reputation', 0)
                print(f"    Reputation Score: {rep_score}")
                
            elif source_name == 'DNSBL' and 'data' in source:
                dnsbl_data = source['data']
                checked = len(dnsbl_data.get('checked_servers', []))
                blacklisted = len(dnsbl_data.get('blacklisted_servers', []))
                print(f"    DNSBL Checks: {checked} servers, {blacklisted} blacklisted")
        
        # Check overall reputation
        overall_rep = result.get('overall_calculated_reputation', {})
        if overall_rep:
            score = overall_rep.get('score', 0)
            level = overall_rep.get('level', 'Unknown')
            print(f"\n🎯 Overall Reputation: {score}/100 ({level})")
        else:
            print("\n⚠️  No overall reputation calculated")
            
        print(f"\n✅ Test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Check if API keys are configured
    abuseipdb_key = os.getenv('ABUSEIPDB_API_KEY')
    virustotal_key = os.getenv('VIRUSTOTAL_API_KEY')
    
    print("API Key Status:")
    print(f"AbuseIPDB: {'✅ Configured' if abuseipdb_key and abuseipdb_key != 'your_abuseipdb_api_key_here' else '❌ Not configured'}")
    print(f"VirusTotal: {'✅ Configured' if virustotal_key and virustotal_key != 'your_virustotal_api_key_here' else '❌ Not configured'}")
    print()
    
    # Run the test
    asyncio.run(test_external_apis())
