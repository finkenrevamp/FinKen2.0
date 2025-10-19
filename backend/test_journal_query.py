"""
Test script to verify journal entry queries
Run this to see what data is actually being returned
"""
import os
from dotenv import load_dotenv
from supabase.client import create_client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Create Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Test the same query used in the route
print("Testing journal entries query...\n")

result = supabase.from_("journalentries").select(
    """
    *,
    creator:profiles!journalentries_CreatedByUserID_fkey(Username),
    approver:profiles!journalentries_ApprovedByUserID_fkey(Username),
    journalentrylines(
        LineID,
        AccountID,
        Type,
        Amount,
        chartofaccounts(AccountNumber, AccountName)
    )
    """
).limit(1).execute()

if result.data:
    entry = result.data[0]
    print(f"Journal Entry ID: {entry.get('JournalEntryID')}")
    print(f"Entry Date: {entry.get('EntryDate')}")
    print(f"\nCreator data type: {type(entry.get('creator'))}")
    print(f"Creator data: {entry.get('creator')}")
    
    print(f"\nLines count: {len(entry.get('journalentrylines', []))}")
    if entry.get('journalentrylines'):
        line = entry['journalentrylines'][0]
        print(f"First line: {line}")
        print(f"Chart of accounts type: {type(line.get('chartofaccounts'))}")
        print(f"Chart of accounts data: {line.get('chartofaccounts')}")
else:
    print("No journal entries found")
