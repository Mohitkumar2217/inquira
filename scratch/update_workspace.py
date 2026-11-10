import sqlite3
from datetime import datetime, timedelta

con = sqlite3.connect('backend/inquira.db')
cur = con.cursor()

# Set workspace 1 to 'newmohit'
cur.execute("UPDATE workspaces SET name='newmohit' WHERE id=1")

# Check inquiries in workspace 1
inqs = cur.execute("SELECT id, title, workspace_id, updated_at FROM inquiries WHERE workspace_id=1").fetchall()
print('Before:', inqs)

# Ensure form 1 and form 3 are titled 'New form'
cur.execute("UPDATE inquiries SET title='New form', status='draft', updated_at=? WHERE id=1", (datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),))
cur.execute("UPDATE inquiries SET title='New form', status='draft', updated_at=? WHERE id=3", ((datetime.utcnow() - timedelta(days=2)).strftime('%Y-%m-%d %H:%M:%S'),))

inqs_after = cur.execute("SELECT id, title, workspace_id, updated_at, status FROM inquiries WHERE workspace_id=1").fetchall()
print('After:', inqs_after)

workspaces = cur.execute("SELECT id, name, is_private FROM workspaces").fetchall()
print('Workspaces:', workspaces)

con.commit()
con.close()
