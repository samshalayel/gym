from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.crud.expense import create_expense, delete_expense, get_expense_report, get_expenses, update_expense
from app.database import get_db
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


@router.get("")
def list_expenses(
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    items = get_expenses(db, category=category, start_date=start_date, end_date=end_date)
    return {"total": len(items), "items": items}


@router.get("/report")
def expense_report(
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    return get_expense_report(db, category=category, start_date=start_date, end_date=end_date)


@router.post("", response_model=ExpenseResponse, status_code=201)
def create_expense_endpoint(data: ExpenseCreate, db: Session = Depends(get_db)):
    return create_expense(db, data)


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense_endpoint(expense_id: int, data: ExpenseUpdate, db: Session = Depends(get_db)):
    expense = update_expense(db, expense_id, data)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.delete("/{expense_id}")
def delete_expense_endpoint(expense_id: int, db: Session = Depends(get_db)):
    if not delete_expense(db, expense_id):
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}
