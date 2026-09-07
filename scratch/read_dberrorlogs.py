import mysql.connector

try:
    conn = mysql.connector.connect(
        host="192.168.1.24",
        port=3306,
        user="VM2",
        password="MARKS@123a",
        database="DELED2026"
    )
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM dberrorlogs WHERE Path LIKE '%dashboard%' OR Path LIKE '%admin%' ORDER BY Id DESC LIMIT 10")
    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    print("Database Error Logs for dashboard/admin:")
    for row in rows:
        print("-" * 60)
        for col_name, val in zip(columns, row):
            print(f"{col_name}: {val}")
except Exception as e:
    print(f"Error: {e}")
