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
    cursor.execute("SELECT Id, UserId, MerchantTxnId, Status, AtomTxnId, ResponseJson, CreatedOn FROM PaymentTransactions ORDER BY Id DESC LIMIT 5")
    rows = cursor.fetchall()
    for row in rows:
        print(f"Id: {row[0]}, UserId: {row[1]}, MerchantTxnId: {row[2]}, Status: {row[3]}, AtomTxnId: {row[4]}, CreatedOn: {row[6]}")
        print(f"ResponseJson: {row[5]}")
        print("-" * 50)
except Exception as e:
    print(f"Error: {e}")
