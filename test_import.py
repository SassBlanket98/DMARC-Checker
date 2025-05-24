#!/usr/bin/env python3
"""
Test script to check if all modules import correctly
"""

try:
    print("Testing imports...")
    
    print("Importing Flask components...")
    from flask import Flask, request, jsonify, render_template
    
    print("Importing custom modules...")
    import dmarc_lookup
    import reputation
    import email_tester
    
    print("Importing error handling...")
    from error_handling import (
        api_error_handler,
        configure_enhanced_logging,
        handle_dmarc_error,
        handle_spf_error,
        handle_dkim_error,
        DomainError
    )
    
    print("Importing auth verification...")
    from auth_verification import verify_spf_setup, verify_dkim_setup, verify_dmarc_setup, calculate_overall_auth_status
    
    print("All imports successful!")
    
except ImportError as e:
    print(f"Import error: {e}")
except Exception as e:
    print(f"Other error: {e}")
