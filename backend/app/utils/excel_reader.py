import pandas as pd

def read_targeting_report(file):
    file.file.seek(0)

    df = pd.read_excel(file.file, engine="openpyxl")

    # Clean NaN
    df = df.fillna(0)

    # 🔥 Remove extra spaces from column names
    df.columns = df.columns.str.strip()

    return df