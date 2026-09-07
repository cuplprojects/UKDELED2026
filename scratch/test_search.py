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
    
    # 1. List tables
    cursor.execute("SHOW TABLES")
    tables = [t[0] for t in cursor.fetchall()]
    print("Tables in database:", tables)
    
    # Determine the table name for Users
    table_name = "Users" if "Users" in tables else "UserRegistration"
    if table_name not in tables:
        # Check case insensitivity
        for t in tables:
            if t.lower() in ["users", "userregistration", "userregistrations"]:
                table_name = t
                break
    
    print(f"Using table name: {table_name}")
    
    # 2. Describe table
    cursor.execute(f"DESCRIBE {table_name}")
    columns = cursor.fetchall()
    print("\nColumns in table:")
    for col in columns:
        print(f"  Field: {col[0]}, Type: {col[1]}, Null: {col[2]}, Key: {col[3]}, Default: {col[4]}")
        
    # 3. Get total count
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cursor.fetchone()[0]
    print(f"\nTotal rows in {table_name}: {count}")
    
    # 4. Check for null values in search columns
    print("\nChecking null counts in columns:")
    for col in ["RegistrationNo", "FullName", "PhoneNumber", "Email"]:
        # Find exact case of the column
        exact_col = None
        for c in columns:
            if c[0].lower() == col.lower():
                exact_col = c[0]
                break
        if exact_col:
            cursor.execute(f"SELECT COUNT(*) FROM {table_name} WHERE {exact_col} IS NULL")
            null_count = cursor.fetchone()[0]
            print(f"  {exact_col}: {null_count} nulls")
        else:
            print(f"  Column {col} not found")
            
    # 5. Fetch sample rows
    cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
    rows = cursor.fetchall()
    print("\nSample rows:")
    for r in rows:
        print(r)
        
except Exception as e:
    print(f"Error: {e}")
