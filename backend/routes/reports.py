"""
Financial Reports routes for FinKen 2.0
Handles report generation operations
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional
import logging
from decimal import Decimal
from datetime import datetime

from services.supabase import get_supabase_client
from routes.auth import get_current_user_from_token
from models.auth import Profile

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/health")
async def reports_health():
    """Reports service health check"""
    return {"status": "healthy", "service": "reports"}

@router.get("/retained-earnings")
async def get_retained_earnings_report(
    start_date: str = Query(..., description="Start date for the report period (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date for the report period (YYYY-MM-DD)"),
    current_user: Profile = Depends(get_current_user_from_token)
):
    """
    Generate Retained Earnings report for a specified date range
    
    Formula:
    Beginning Retained Earnings
    + Net Income (Revenues - Expenses for the period)
    - Dividends (if any)
    = Ending Retained Earnings
    """
    try:
        supabase = get_supabase_client()
        
        # Validate date format
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            
            if end_dt < start_dt:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="End date must be after start date"
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
        
        # Format dates for database queries (ensure we get the full day range)
        # Add one day to end_date to include all entries on that day
        from datetime import timedelta
        end_date_inclusive = (end_dt + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Get all approved journal entries and their lines for the period
        # We need to calculate revenues and expenses from the journal entries
        # Use < end_date_inclusive instead of <= end_date to handle timezone issues
        journal_entries = supabase.from_("journalentries").select(
            """
            JournalEntryID,
            EntryDate,
            Status,
            journalentrylines(
                AccountID,
                Type,
                Amount,
                chartofaccounts(
                    AccountID,
                    AccountName,
                    Category,
                    NormalSide
                )
            )
            """
        ).eq("Status", "Approved").gte("EntryDate", start_date).lt("EntryDate", end_date_inclusive).execute()
        
        # Calculate net income from revenue and expense accounts
        total_revenue = Decimal("0.00")
        total_expenses = Decimal("0.00")
        revenue_details = []
        expense_details = []
        
        # Process all journal entry lines
        for entry in journal_entries.data:
            for line in entry.get("journalentrylines", []):
                account = line.get("chartofaccounts")
                
                # Handle both dict and list responses
                if isinstance(account, list) and len(account) > 0:
                    account = account[0]
                
                if not account:
                    continue
                
                category = account.get("Category")
                normal_side = account.get("NormalSide")
                account_name = account.get("AccountName")
                amount = Decimal(str(line.get("Amount", "0.00")))
                line_type = line.get("Type")
                
                # Revenue accounts (Credit normal side)
                if category == "Revenue":
                    # Credits increase revenue, debits decrease it
                    if line_type == "Credit":
                        total_revenue += amount
                        revenue_details.append({
                            "account_name": account_name,
                            "amount": str(amount),
                            "type": "Credit"
                        })
                    else:  # Debit
                        total_revenue -= amount
                        revenue_details.append({
                            "account_name": account_name,
                            "amount": str(-amount),
                            "type": "Debit"
                        })
                
                # Expense accounts (Debit normal side)
                elif category == "Expense":
                    # Debits increase expenses, credits decrease it
                    if line_type == "Debit":
                        total_expenses += amount
                        expense_details.append({
                            "account_name": account_name,
                            "amount": str(amount),
                            "type": "Debit"
                        })
                    else:  # Credit
                        total_expenses -= amount
                        expense_details.append({
                            "account_name": account_name,
                            "amount": str(-amount),
                            "type": "Credit"
                        })
        
        # Calculate net income
        net_income = total_revenue - total_expenses
        
        # Get beginning retained earnings
        # This is the balance of Retained Earnings account at the start of the period
        retained_earnings_account = supabase.from_("chartofaccounts").select(
            "AccountID, Balance, AccountName"
        ).eq("Category", "Equity").ilike("AccountName", "%retained earnings%").execute()
        
        beginning_retained_earnings = Decimal("0.00")
        retained_earnings_account_id = None
        
        if retained_earnings_account.data and len(retained_earnings_account.data) > 0:
            retained_earnings_account_id = retained_earnings_account.data[0].get("AccountID")
            current_balance = Decimal(str(retained_earnings_account.data[0].get("Balance", "0.00")))
            
            # Get all ledger entries for this account in the period to back out the beginning balance
            ledger_entries = supabase.from_("accountledger").select(
                "Debit, Credit"
            ).eq("AccountID", retained_earnings_account_id).gte("TransactionDate", start_date).lt("TransactionDate", end_date_inclusive).execute()
            
            period_debits = Decimal("0.00")
            period_credits = Decimal("0.00")
            
            for ledger_entry in ledger_entries.data:
                period_debits += Decimal(str(ledger_entry.get("Debit", "0.00")))
                period_credits += Decimal(str(ledger_entry.get("Credit", "0.00")))
            
            # Retained Earnings is a Credit account, so:
            # Beginning Balance = Current Balance - (Period Credits - Period Debits)
            beginning_retained_earnings = current_balance - (period_credits - period_debits)
        
        # Get dividends paid during the period (if any)
        # Dividends reduce retained earnings
        dividends = Decimal("0.00")
        dividend_details = []
        
        # Look for dividend accounts (equity accounts with "dividend" in the name)
        dividend_accounts = supabase.from_("chartofaccounts").select(
            "AccountID, AccountName"
        ).eq("Category", "Equity").ilike("AccountName", "%dividend%").execute()
        
        for div_account in dividend_accounts.data:
            account_id = div_account.get("AccountID")
            
            # Get ledger entries for dividends in the period
            div_ledger = supabase.from_("accountledger").select(
                "Debit, Credit, Description, TransactionDate"
            ).eq("AccountID", account_id).gte("TransactionDate", start_date).lt("TransactionDate", end_date_inclusive).execute()
            
            for entry in div_ledger.data:
                # Dividends are typically recorded as debits to the dividend account
                debit = Decimal(str(entry.get("Debit", "0.00")))
                credit = Decimal(str(entry.get("Credit", "0.00")))
                
                if debit > Decimal("0.00"):
                    dividends += debit
                    dividend_details.append({
                        "date": entry.get("TransactionDate"),
                        "description": entry.get("Description"),
                        "amount": str(debit)
                    })
                
                if credit > Decimal("0.00"):
                    dividends -= credit
                    dividend_details.append({
                        "date": entry.get("TransactionDate"),
                        "description": entry.get("Description"),
                        "amount": str(-credit)
                    })
        
        # Calculate ending retained earnings
        ending_retained_earnings = beginning_retained_earnings + net_income - dividends
        
        # Format the report
        report = {
            "period": {
                "start_date": start_date,
                "end_date": end_date,
                "formatted_end_date": end_dt.strftime("%B %d, %Y")
            },
            "beginning_retained_earnings": str(beginning_retained_earnings),
            "net_income": {
                "total": str(net_income),
                "revenue": {
                    "total": str(total_revenue),
                    "details": revenue_details
                },
                "expenses": {
                    "total": str(total_expenses),
                    "details": expense_details
                }
            },
            "dividends": {
                "total": str(dividends),
                "details": dividend_details
            },
            "ending_retained_earnings": str(ending_retained_earnings),
            "summary": {
                "beginning_balance": str(beginning_retained_earnings),
                "add_net_income": str(net_income),
                "less_dividends": str(dividends),
                "ending_balance": str(ending_retained_earnings)
            }
        }
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get retained earnings report error: {e}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while generating the retained earnings report: {str(e)}"
        )

@router.get("/income-statement")
async def get_income_statement_report(
    start_date: str = Query(..., description="Start date for the report period (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date for the report period (YYYY-MM-DD)"),
    current_user: Profile = Depends(get_current_user_from_token)
):
    """
    Generate Income Statement report for a specified date range
    
    Formula:
    Total Revenue
    - Total Expenses
    = Net Income
    """
    try:
        supabase = get_supabase_client()
        
        # Validate date format
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            
            if end_dt < start_dt:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="End date must be after start date"
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
        
        # Format dates for database queries (ensure we get the full day range)
        # Add one day to end_date to include all entries on that day
        from datetime import timedelta
        end_date_inclusive = (end_dt + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Get all approved journal entries and their lines for the period
        journal_entries = supabase.from_("journalentries").select(
            """
            JournalEntryID,
            EntryDate,
            Status,
            journalentrylines(
                AccountID,
                Type,
                Amount,
                chartofaccounts(
                    AccountID,
                    AccountName,
                    Category,
                    NormalSide
                )
            )
            """
        ).eq("Status", "Approved").gte("EntryDate", start_date).lt("EntryDate", end_date_inclusive).execute()
        
        # Calculate revenue and expenses from journal entry lines
        total_revenue = Decimal("0.00")
        total_expenses = Decimal("0.00")
        revenue_details = []
        expense_details = []
        
        # Dictionary to aggregate revenue and expense accounts
        revenue_accounts = {}
        expense_accounts = {}
        
        # Process all journal entry lines
        for entry in journal_entries.data:
            for line in entry.get("journalentrylines", []):
                account = line.get("chartofaccounts")
                
                # Handle both dict and list responses
                if isinstance(account, list) and len(account) > 0:
                    account = account[0]
                
                if not account:
                    continue
                
                category = account.get("Category")
                normal_side = account.get("NormalSide")
                account_name = account.get("AccountName")
                amount = Decimal(str(line.get("Amount", "0.00")))
                line_type = line.get("Type")
                
                # Revenue accounts (Credit normal side)
                if category == "Revenue":
                    # Credits increase revenue, debits decrease it
                    if line_type == "Credit":
                        total_revenue += amount
                        if account_name not in revenue_accounts:
                            revenue_accounts[account_name] = Decimal("0.00")
                        revenue_accounts[account_name] += amount
                    else:  # Debit
                        total_revenue -= amount
                        if account_name not in revenue_accounts:
                            revenue_accounts[account_name] = Decimal("0.00")
                        revenue_accounts[account_name] -= amount
                
                # Expense accounts (Debit normal side)
                elif category == "Expense":
                    # Debits increase expenses, credits decrease it
                    if line_type == "Debit":
                        total_expenses += amount
                        if account_name not in expense_accounts:
                            expense_accounts[account_name] = Decimal("0.00")
                        expense_accounts[account_name] += amount
                    else:  # Credit
                        total_expenses -= amount
                        if account_name not in expense_accounts:
                            expense_accounts[account_name] = Decimal("0.00")
                        expense_accounts[account_name] -= amount
        
        # Convert aggregated accounts to details list
        for account_name, amount in revenue_accounts.items():
            if amount != Decimal("0.00"):
                revenue_details.append({
                    "account_name": account_name,
                    "amount": str(amount),
                    "type": "Credit" if amount > 0 else "Debit"
                })
        
        for account_name, amount in expense_accounts.items():
            if amount != Decimal("0.00"):
                expense_details.append({
                    "account_name": account_name,
                    "amount": str(abs(amount)),
                    "type": "Debit" if amount > 0 else "Credit"
                })
        
        # Calculate net income
        net_income = total_revenue - total_expenses
        
        # Format the report
        report = {
            "period": {
                "start_date": start_date,
                "end_date": end_date,
                "formatted_end_date": end_dt.strftime("%B %d, %Y")
            },
            "revenue": {
                "total": str(total_revenue),
                "details": revenue_details
            },
            "expenses": {
                "total": str(total_expenses),
                "details": expense_details
            },
            "net_income": str(net_income)
        }
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get income statement report error: {e}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while generating the income statement report: {str(e)}"
        )