import sqlite3
con = sqlite3.connect("backend/inquira.db")
cur = con.cursor()
print("Workspaces:")
for row in cur.execute("SELECT id, name, is_private, last_visited_at FROM workspaces").fetchall():
    print(" ", row)
print("\nInquiries:")
for row in cur.execute("SELECT id, title, status, workspace_id, created_at, updated_at FROM inquiries").fetchall():
    print(" ", row)
con.close()
