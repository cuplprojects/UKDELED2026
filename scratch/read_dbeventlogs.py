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
    cursor.execute("SELECT * FROM dbeventlogs ORDER BY Id DESC LIMIT 10")
    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    print("Database Event Logs (latest 10):")
    for row in rows:
        print("-" * 60)
        for col_name, val in zip(columns, row):
            if col_name == 'Body' and val and len(str(val)) > 150:
                print(f"{col_name}: {str(val)[:150]}... [TRUNCATED]")
            else:
                print(f"{col_name}: {val}")
except Exception as e:
    print(f"Error: {e}")
