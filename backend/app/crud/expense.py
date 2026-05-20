from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate, ExpenseUpdate


def get_expenses(db: Session, category: str = None, start_date: date = None, end_date: date = None):
    query = db.query(Expense)
    if category:
        query = query.filter(Expense.category == category)
    if start_date:
        query = query.filter(Expense.expense_date >= start_date)
    if end_date:
        query = query.filter(Expense.expense_date <= end_date)
    return query.order_by(Expense.expense_date.desc(), Expense.id.desc()).all()


def get_expense(db: Session, expense_id: int):
    return db.query(Expense).filter(Expense.id == expense_id).first()


def create_expense(db: Session, data: ExpenseCreate):
    payload = data.model_dump()
    if payload.get("expense_date") is None:
        payload["expense_date"] = date.today()
    expense = Expense(**payload)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def update_expense(db: Session, expense_id: int, data: ExpenseUpdate):
    expense = get_expense(db, expense_id)
    if not expense:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(expense, key, value)
    db.commit()
    db.refresh(expense)
    return expense


def delete_expense(db: Session, expense_id: int):
    expense = get_expense(db, expense_id)
    if not expense:
        return False
    db.delete(expense)
    db.commit()
    return True


def get_expense_report(db: Session, category: str = None, start_date: date = None, end_date: date = None):
    rows = get_expenses(db, category=category, start_date=start_date, end_date=end_date)
    total = sum(row.amount or 0 for row in rows)
    by_category = (
        db.query(Expense.category, func.sum(Expense.amount))
        .filter(True)
    )
    if category:
        by_category = by_category.filter(Expense.category == category)
    if start_date:
        by_category = by_category.filter(Expense.expense_date >= start_date)
    if end_date:
        by_category = by_category.filter(Expense.expense_date <= end_date)
    grouped = [{"category": cat, "total": amount or 0} for cat, amount in by_category.group_by(Expense.category).all()]
    return {"total": total, "by_category": grouped, "items": rows}
